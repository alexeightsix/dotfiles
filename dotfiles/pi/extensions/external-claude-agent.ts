import {
	spawn as nodeSpawn,
	type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { StringEnum } from "@earendil-works/pi-ai";
import {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	formatSize,
	truncateHead,
	type AgentToolResult,
	type ExtensionAPI,
	withFileMutationQueue,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

import { slotId, stripPiOnlySections } from "../lib/parse.ts";

const CLAUDE_INSTANCES = ["claude", "claude2"] as const;
type ClaudeInstance = (typeof CLAUDE_INSTANCES)[number];

/**
 * Concurrency caps per binary. `claude` is the 5x Max account and can carry
 * four subagents at once; `claude2` is a 1x account and gets two. Going over
 * these is what gets an account rate-limited, so the cap is enforced here
 * rather than left to the model's judgement.
 */
const SLOT_LIMITS: Record<ClaudeInstance, number> = {
	claude: 4,
	claude2: 2,
};

/** A running subagent is addressed as `claude#2`, `claude2#1`, and so on. */
type SlotId = string;

interface ClaudeUsage {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	costUsd: number;
	durationMs: number;
}

function emptyUsage(): ClaudeUsage {
	return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0, durationMs: 0 };
}

function fmtTokens(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1000) return `${Math.round(n / 1000)}k`;
	return `${n}`;
}

const ANSI_ESCAPE_RE = /\x1b\[[0-?]*[ -/]*[@-~]/g;
const READ_ONLY_TOOLS = "Read,Grep,Glob,Bash";
const READ_ONLY_ALLOWLIST = [
	"Read",
	"Grep",
	"Glob",
	"Bash(git status *)",
	"Bash(git diff *)",
	"Bash(git log *)",
	"Bash(git show *)",
	"Bash(git branch *)",
	"Bash(pwd)",
	"Bash(ls *)",
].join(",");
const STDERR_LIMIT = 20_000;
const UPDATE_LIMIT = 4_000;
const KILL_GRACE_MS = 5_000;
const STATUS_KEY = "external-claude";

interface ClaudeResultEvent {
	type: "result";
	subtype?: string;
	result?: string;
	session_id?: string;
	total_cost_usd?: number;
	duration_ms?: number;
	num_turns?: number;
	error?: string;
}

interface ClaudeAgentStatus {
	slot: SlotId;
	instance: ClaudeInstance;
	model?: string;
	pid?: number;
	state: "idle" | "running";
	turns: number;
	usage: ClaudeUsage;
}

interface ClaudeToolDetails {
	slot?: SlotId;
	instance?: ClaudeInstance;
	model?: string;
	sessionId?: string;
	turns?: number;
	costUsd?: number;
	durationMs?: number;
	usage?: ClaudeUsage;
	fullOutputPath?: string;
	truncated?: boolean;
	instances: ClaudeAgentStatus[];
}

interface PendingTurn {
	abortCleanup?: () => void;
	lastAssistantText: string;
	lastUpdateAt: number;
	onUpdate?: (partial: AgentToolResult<ClaudeToolDetails>) => void;
	partialText: string;
	reject(error: Error): void;
	resolve(event: ClaudeResultEvent): void;
	settled: boolean;
}

interface ClaudeProcessState {
	contextHash: string;
	cwd: string;
	slot: SlotId;
	instance: ClaudeInstance;
	model?: string;
	pending?: PendingTurn;
	process: ChildProcessWithoutNullStreams;
	sessionId?: string;
	stderr: string;
	stdoutBuffer: string;
	tempDir: string;
	turns: number;
	usage: ClaudeUsage;
}

type SpawnClaude = (
	command: string,
	args: string[],
	options: {
		cwd: string;
		env: NodeJS.ProcessEnv;
		stdio: ["pipe", "pipe", "pipe"];
	},
) => ChildProcessWithoutNullStreams;

export interface ExternalClaudeAgentDependencies {
	spawn?: SpawnClaude;
}

const ClaudeParams = Type.Object({
	action: StringEnum(["run", "status", "teardown"] as const, {
		description:
			'"run" sends a task, "status" lists active subprocesses, and "teardown" stops one or all subprocesses.',
	}),
	instance: Type.Optional(
		StringEnum(["claude", "claude2", "all"] as const, {
			description:
				'Claude Code account to use. Defaults to "claude". Use "all" only with status or teardown.',
		}),
	),
	slot: Type.Optional(
		Type.Number({
			description:
				"Which concurrent subagent of that account to address (claude: 1-4, claude2: 1-2). Omit to reuse an idle subagent or start a new one. Each slot keeps its own conversation.",
		}),
	),
	task: Type.Optional(
		Type.String({
			description:
				"Task for the selected Claude agent. Required for run. Follow-up calls retain that instance's prior context.",
		}),
	),
	context: Type.Optional(
		Type.String({
			description:
				"Optional new facts, decisions, or excerpts from Pi to add to this turn's retained Claude context.",
		}),
	),
});

function hashContext(context: string): string {
	return createHash("sha256").update(context).digest("hex");
}

function cleanModelName(model: string): string {
	return model
		.replace(ANSI_ESCAPE_RE, "")
		.replace(/\[[0-9;]*m/g, "")
		.trim();
}

function externalSystemPrompt(cwd: string, piSystemPrompt: string): string {
	return [
		"You are a read-only external Claude Code collaborator delegated by a Pi coding agent.",
		`Your working directory is ${cwd}. Inspect the repository and return findings to Pi, but do not edit files, commit, push, or start persistent services.`,
		"The context below is the parent agent's governing instructions. Follow its repository scope, safety rules, and working order.",
		"It is NOT a description of your capabilities. You have your own tools; use those. Any tool name, slash command, or UI mechanic it mentions belongs to the parent agent and is unavailable to you — never attempt to call one, and never tell the user to run one as if you had.",
		"",
		"<pi_governing_context>",
		stripPiOnlySections(piSystemPrompt),
		"</pi_governing_context>",
	].join("\n");
}

function textFromAssistantEvent(event: Record<string, unknown>): string {
	if (event.type !== "assistant") return "";
	const message = event.message;
	if (!message || typeof message !== "object") return "";
	const content = (message as { content?: unknown }).content;
	if (!Array.isArray(content)) return "";
	return content
		.flatMap((part) => {
			if (!part || typeof part !== "object") return [];
			const block = part as { type?: unknown; text?: unknown };
			return block.type === "text" && typeof block.text === "string"
				? [block.text]
				: [];
		})
		.join("\n");
}

function textDeltaFromStreamEvent(event: Record<string, unknown>): string {
	if (event.type !== "stream_event") return "";
	const streamEvent = event.event;
	if (!streamEvent || typeof streamEvent !== "object") return "";
	const delta = (streamEvent as { delta?: unknown }).delta;
	if (!delta || typeof delta !== "object") return "";
	const value = delta as { type?: unknown; text?: unknown };
	return value.type === "text_delta" && typeof value.text === "string"
		? value.text
		: "";
}

function appendBounded(
	current: string,
	addition: string,
	limit: number,
): string {
	const combined = current + addition;
	return combined.length <= limit ? combined : combined.slice(-limit);
}

function userMessage(prompt: string): string {
	return `${JSON.stringify({
		type: "user",
		session_id: "",
		message: {
			role: "user",
			content: [{ type: "text", text: prompt }],
		},
		parent_tool_use_id: null,
	})}\n`;
}

export function registerExternalClaudeAgent(
	pi: ExtensionAPI,
	dependencies: ExternalClaudeAgentDependencies = {},
): void {
	const spawnClaude = dependencies.spawn ?? (nodeSpawn as SpawnClaude);
	const agents = new Map<SlotId, ClaudeProcessState>();
	let setStatus:
		| ((key: string, value: string | undefined) => void)
		| undefined;

	function slotsFor(instance: ClaudeInstance): ClaudeProcessState[] {
		return [...agents.values()].filter((agent) => agent.instance === instance);
	}

	/** The lowest unused slot index for an instance, or null when it is at capacity. */
	function freeSlotIndex(instance: ClaudeInstance): number | null {
		for (let index = 1; index <= SLOT_LIMITS[instance]; index++) {
			if (!agents.has(slotId(instance, index))) return index;
		}
		return null;
	}

	function statuses(): ClaudeAgentStatus[] {
		return CLAUDE_INSTANCES.flatMap((instance) =>
			slotsFor(instance)
				.sort((a, b) => a.slot.localeCompare(b.slot))
				.map(
					(agent) =>
						({
							slot: agent.slot,
							instance,
							model: agent.model,
							pid: agent.process.pid,
							state: agent.pending ? "running" : "idle",
							turns: agent.turns,
							usage: agent.usage,
						}) satisfies ClaudeAgentStatus,
				),
		);
	}

	function publishStatus(): void {
		const active = statuses();
		if (active.length === 0) {
			setStatus?.(STATUS_KEY, undefined);
			return;
		}

		// Kept to one compact chunk so it fits the single-line footer:
		//   claude 2/4·1 run  claude2 1/2  ↑412k ↓18k $1.87
		const perInstance = CLAUDE_INSTANCES.flatMap((instance) => {
			const slots = active.filter((status) => status.instance === instance);
			if (slots.length === 0) return [];
			const running = slots.filter((status) => status.state === "running").length;
			return [`${instance} ${slots.length}/${SLOT_LIMITS[instance]}${running ? `·${running} run` : ""}`];
		});

		const total = active.reduce(
			(sum, status) => ({
				input: sum.input + status.usage.input + status.usage.cacheRead + status.usage.cacheWrite,
				output: sum.output + status.usage.output,
				cost: sum.cost + status.usage.costUsd,
			}),
			{ input: 0, output: 0, cost: 0 },
		);

		const spend = total.input + total.output > 0
			? ` ↑${fmtTokens(total.input)} ↓${fmtTokens(total.output)} $${total.cost.toFixed(2)}`
			: "";

		setStatus?.(STATUS_KEY, `${perInstance.join("  ")}${spend}`);
	}

	function detailsFor(
		agent?: ClaudeProcessState,
		extra: Partial<ClaudeToolDetails> = {},
	): ClaudeToolDetails {
		return {
			slot: agent?.slot,
			instance: agent?.instance,
			model: agent?.model,
			sessionId: agent?.sessionId,
			turns: agent?.turns,
			usage: agent?.usage,
			instances: statuses(),
			...extra,
		};
	}

	function settlePendingWithError(
		agent: ClaudeProcessState,
		error: Error,
	): void {
		const pending = agent.pending;
		if (!pending || pending.settled) return;
		pending.settled = true;
		pending.abortCleanup?.();
		agent.pending = undefined;
		pending.reject(error);
		publishStatus();
	}

	function emitPartialUpdate(agent: ClaudeProcessState): void {
		const pending = agent.pending;
		if (!pending?.onUpdate) return;
		const now = Date.now();
		if (now - pending.lastUpdateAt < 200) return;
		pending.lastUpdateAt = now;
		const text =
			pending.partialText || pending.lastAssistantText || "Claude is working…";
		pending.onUpdate({
			content: [{ type: "text", text: text.slice(-UPDATE_LIMIT) }],
			details: detailsFor(agent),
		});
	}

	function processOutputLine(agent: ClaudeProcessState, line: string): void {
		if (!line.trim()) return;
		let event: Record<string, unknown>;
		try {
			event = JSON.parse(line) as Record<string, unknown>;
		} catch {
			return;
		}

		if (event.type === "system" && event.subtype === "init") {
			if (typeof event.model === "string") {
				agent.model = cleanModelName(event.model);
			}
			if (typeof event.session_id === "string")
				agent.sessionId = event.session_id;
			publishStatus();
			return;
		}

		const assistantText = textFromAssistantEvent(event);
		if (assistantText && agent.pending) {
			agent.pending.lastAssistantText = assistantText;
			emitPartialUpdate(agent);
		}

		const delta = textDeltaFromStreamEvent(event);
		if (delta && agent.pending) {
			agent.pending.partialText += delta;
			emitPartialUpdate(agent);
		}

		if (event.type !== "result") return;
		const pending = agent.pending;
		if (!pending || pending.settled) return;
		pending.settled = true;
		pending.abortCleanup?.();
		agent.pending = undefined;
		agent.turns += 1;
		if (typeof event.session_id === "string")
			agent.sessionId = event.session_id;

		// Claude reports usage per result event; accumulate it so the footer can
		// show what the external agents have actually spent.
		const usage = event.usage as Record<string, unknown> | undefined;
		if (usage && typeof usage === "object") {
			const read = (key: string) =>
				typeof usage[key] === "number" ? (usage[key] as number) : 0;
			agent.usage.input += read("input_tokens");
			agent.usage.output += read("output_tokens");
			agent.usage.cacheRead += read("cache_read_input_tokens");
			agent.usage.cacheWrite += read("cache_creation_input_tokens");
		}
		if (typeof event.total_cost_usd === "number")
			agent.usage.costUsd += event.total_cost_usd;
		if (typeof event.duration_ms === "number")
			agent.usage.durationMs += event.duration_ms;
		const resultEvent = event as unknown as ClaudeResultEvent;
		if (!resultEvent.result) {
			resultEvent.result = pending.lastAssistantText || pending.partialText;
		}
		pending.resolve(resultEvent);
		publishStatus();
	}

	async function startAgent(
		instance: ClaudeInstance,
		slot: SlotId,
		cwd: string,
		piSystemPrompt: string,
	): Promise<ClaudeProcessState> {
		const tempDir = await mkdtemp(join(tmpdir(), `pi-${slot.replace("#", "-")}-`));
		const args = [
			"--print",
			"--input-format",
			"stream-json",
			"--output-format",
			"stream-json",
			"--verbose",
			"--include-partial-messages",
			"--no-session-persistence",
			"--safe-mode",
			"--permission-mode",
			"dontAsk",
			"--tools",
			READ_ONLY_TOOLS,
			"--allowedTools",
			READ_ONLY_ALLOWLIST,
			"--append-system-prompt",
			externalSystemPrompt(cwd, piSystemPrompt),
		];
		const child = spawnClaude(instance, args, {
			cwd,
			env: { ...process.env },
			stdio: ["pipe", "pipe", "pipe"],
		});
		const agent: ClaudeProcessState = {
			contextHash: hashContext(piSystemPrompt),
			cwd,
			slot,
			instance,
			process: child,
			stderr: "",
			stdoutBuffer: "",
			tempDir,
			turns: 0,
			usage: emptyUsage(),
		};
		agents.set(slot, agent);
		publishStatus();
		// session-stats.ts counts subagents from this.
		pi.events.emit("claude:spawn", { slot, instance, cwd });

		child.stdout.on("data", (chunk: Buffer | string) => {
			agent.stdoutBuffer += chunk.toString();
			const lines = agent.stdoutBuffer.split("\n");
			agent.stdoutBuffer = lines.pop() ?? "";
			for (const line of lines) processOutputLine(agent, line);
		});
		child.stderr.on("data", (chunk: Buffer | string) => {
			agent.stderr = appendBounded(
				agent.stderr,
				chunk.toString(),
				STDERR_LIMIT,
			);
		});
		child.on("error", (error: Error) => {
			settlePendingWithError(
				agent,
				new Error(`Could not start ${slot}: ${error.message}`),
			);
		});
		child.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
			if (agent.stdoutBuffer.trim())
				processOutputLine(agent, agent.stdoutBuffer);
			agent.stdoutBuffer = "";
			if (agents.get(slot) === agent) agents.delete(slot);
			const reason =
				agent.stderr.trim() ||
				`exit ${code ?? "unknown"}${signal ? ` (${signal})` : ""}`;
			settlePendingWithError(
				agent,
				new Error(
					`${slot} subprocess ended before returning a result: ${reason}`,
				),
			);
			void rm(agent.tempDir, { recursive: true, force: true });
			publishStatus();
		});
		return agent;
	}

	async function stopAgent(slot: SlotId): Promise<boolean> {
		const agent = agents.get(slot);
		if (!agent) return false;
		agents.delete(slot);
		settlePendingWithError(agent, new Error(`${slot} was torn down`));
		publishStatus();

		if (agent.process.exitCode === null && agent.process.signalCode === null) {
			agent.process.kill("SIGTERM");
			await new Promise<void>((resolve) => {
				let settled = false;
				let killTimer: ReturnType<typeof setTimeout> | undefined;
				const finish = () => {
					if (settled) return;
					settled = true;
					if (killTimer) clearTimeout(killTimer);
					resolve();
				};
				agent.process.once("close", finish);
				killTimer = setTimeout(() => {
					if (
						agent.process.exitCode === null &&
						agent.process.signalCode === null
					) {
						agent.process.kill("SIGKILL");
					}
					finish();
				}, KILL_GRACE_MS);
			});
		}
		await rm(agent.tempDir, { recursive: true, force: true });
		return true;
	}

	async function runTurn(
		agent: ClaudeProcessState,
		prompt: string,
		signal: AbortSignal | undefined,
		onUpdate: PendingTurn["onUpdate"],
	): Promise<ClaudeResultEvent> {
		if (agent.pending) {
			throw new Error(
				`${agent.slot} is already running a turn. Omit "slot" to get a free subagent, or wait for this one to finish.`,
			);
		}
		if (signal?.aborted) throw new Error(`${agent.slot} turn was aborted`);

		return new Promise<ClaudeResultEvent>((resolve, reject) => {
			const pending: PendingTurn = {
				lastAssistantText: "",
				lastUpdateAt: 0,
				onUpdate,
				partialText: "",
				reject,
				resolve,
				settled: false,
			};
			agent.pending = pending;
			publishStatus();

			if (signal) {
				const abort = () => {
					settlePendingWithError(
						agent,
						new Error(
							`${agent.slot} turn was aborted; its subprocess was torn down`,
						),
					);
					void stopAgent(agent.slot);
				};
				signal.addEventListener("abort", abort, { once: true });
				pending.abortCleanup = () => signal.removeEventListener("abort", abort);
			}

			agent.process.stdin.write(userMessage(prompt), (error?: Error | null) => {
				if (!error) return;
				settlePendingWithError(
					agent,
					new Error(
						`Could not send a task to ${agent.slot}: ${error.message}`,
					),
				);
				void stopAgent(agent.slot);
			});
		});
	}

	pi.registerTool({
		name: "claude",
		label: "Claude Agent",
		description: [
			"Run a read-only external Claude Code agent as a long-lived subprocess.",
			"The claude and claude2 instances use their respective CLI profiles and retain separate context across calls, so you may switch between them.",
			"On the first call, the selected instance receives Pi's governing system context and runs in Pi's cwd; later calls retain the Claude conversation and receive context updates when Pi's system context changes.",
			"Use action=status to inspect both instances and action=teardown when an instance is no longer needed.",
			`Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}; full truncated output is kept only until teardown.`,
		].join(" "),
		promptSnippet:
			"Delegate read-only repository investigation or review to persistent claude/claude2 subprocesses",
		promptGuidelines: [
			"Use claude for independent read-only repository investigation or review when a Claude Code perspective would improve confidence.",
			"Use claude with instance claude or claude2 deliberately; each instance retains independent context, and status reports the model deployed in each.",
			"Use claude action=teardown after the external context is no longer needed; never assume the external agent may edit files.",
		],
		parameters: ClaudeParams,

		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			const requested = params.instance ?? "claude";
			if (params.action === "status") {
				const current = statuses();
				const summary =
					current.length === 0
						? `No Claude subagents are active. Capacity: ${CLAUDE_INSTANCES.map((i) => `${i} ${SLOT_LIMITS[i]}`).join(", ")}.`
						: [
								...current.map(
									(status) =>
										`${status.slot}: ${status.model ?? "starting"} (${status.state}, ${status.turns} turns, ↑${fmtTokens(status.usage.input + status.usage.cacheRead + status.usage.cacheWrite)} ↓${fmtTokens(status.usage.output)}, $${status.usage.costUsd.toFixed(2)}, pid ${status.pid ?? "?"})`,
								),
								CLAUDE_INSTANCES.map(
									(i) => `${i}: ${slotsFor(i).length}/${SLOT_LIMITS[i]} slots in use`,
								).join("  "),
							].join("\n");
				return {
					content: [{ type: "text", text: summary }],
					details: detailsFor(),
				};
			}

			if (params.action === "teardown") {
				const instances =
					requested === "all"
						? [...CLAUDE_INSTANCES]
						: [requested as ClaudeInstance];
				const targets =
					params.slot !== undefined && requested !== "all"
						? [slotId(requested as ClaudeInstance, params.slot)]
						: instances.flatMap((instance) => slotsFor(instance).map((agent) => agent.slot));
				const stopped = (
					await Promise.all(targets.map((slot) => stopAgent(slot)))
				).filter(Boolean).length;
				return {
					content: [
						{
							type: "text",
							text:
								stopped === 0
									? "No matching Claude subprocess was active."
									: `Tore down ${stopped} Claude subprocess${stopped === 1 ? "" : "es"}. In-memory context and temporary output files were removed.`,
						},
					],
					details: detailsFor(),
				};
			}

			if (requested === "all") {
				throw new Error(
					'Use instance "claude" or "claude2" with action "run".',
				);
			}
			if (!params.task?.trim()) {
				throw new Error('The "task" parameter is required with action "run".');
			}

			const instance = requested as ClaudeInstance;
			const limit = SLOT_LIMITS[instance];
			const currentSystemPrompt = ctx.getSystemPrompt();

			if (params.slot !== undefined && (params.slot < 1 || params.slot > limit)) {
				throw new Error(
					`${instance} has slots 1-${limit}; ${params.slot} is out of range.`,
				);
			}

			// Explicit slot addresses one conversation. Without one, reuse an idle
			// subagent in this cwd before spending a slot on a new process, and
			// refuse rather than exceed the account's concurrency cap.
			let agent: ClaudeProcessState | undefined;
			if (params.slot !== undefined) {
				agent = agents.get(slotId(instance, params.slot));
				if (!agent) {
					agent = await startAgent(
						instance,
						slotId(instance, params.slot),
						ctx.cwd,
						currentSystemPrompt,
					);
				}
			} else {
				agent = slotsFor(instance).find(
					(candidate) => !candidate.pending && candidate.cwd === ctx.cwd,
				);
				if (!agent) {
					const index = freeSlotIndex(instance);
					if (index === null) {
						const busy = slotsFor(instance)
							.map((candidate) => candidate.slot)
							.join(", ");
						throw new Error(
							`${instance} is at capacity: ${limit} concurrent subagents (${busy}). Wait for one to finish, tear one down, or use ${instance === "claude" ? "claude2" : "claude"}.`,
						);
					}
					agent = await startAgent(
						instance,
						slotId(instance, index),
						ctx.cwd,
						currentSystemPrompt,
					);
				}
			}

			if (agent.cwd !== ctx.cwd) {
				throw new Error(
					`${agent.slot} is bound to ${agent.cwd}. Tear it down before using it from ${ctx.cwd}.`,
				);
			}

			const sections: string[] = [];
			const nextHash = hashContext(currentSystemPrompt);
			if (nextHash !== agent.contextHash) {
				sections.push(
					"Pi's governing context changed since your previous turn. Apply this updated context going forward:\n\n<pi_governing_context_update>\n" +
						currentSystemPrompt +
						"\n</pi_governing_context_update>",
				);
				agent.contextHash = nextHash;
			}
			if (params.context?.trim()) {
				sections.push(
					`Additional context from Pi:\n\n${params.context.trim()}`,
				);
			}
			sections.push(`Task from Pi:\n\n${params.task.trim()}`);

			const event = await runTurn(
				agent,
				sections.join("\n\n"),
				signal,
				onUpdate,
			);
			const output =
				event.result?.trim() || "(Claude returned no text output.)";
			const truncation = truncateHead(output, {
				maxBytes: DEFAULT_MAX_BYTES,
				maxLines: DEFAULT_MAX_LINES,
			});
			let resultText = truncation.content;
			const extra: Partial<ClaudeToolDetails> = {
				costUsd: event.total_cost_usd,
				durationMs: event.duration_ms,
				truncated: truncation.truncated,
			};
			if (truncation.truncated) {
				const outputPath = join(agent.tempDir, `turn-${agent.turns}.md`);
				await withFileMutationQueue(outputPath, () =>
					writeFile(outputPath, output, { encoding: "utf8", mode: 0o600 }),
				);
				extra.fullOutputPath = outputPath;
				resultText += `\n\n[Output truncated to ${truncation.outputLines}/${truncation.totalLines} lines and ${formatSize(truncation.outputBytes)}/${formatSize(truncation.totalBytes)}. Full output is available at ${outputPath} until ${agent.slot} is torn down.]`;
			}

			return {
				content: [{ type: "text", text: resultText }],
				details: detailsFor(agent, extra),
			};
		},

		renderCall(args, theme) {
			const instance = args.instance ?? "claude";
			const target = args.slot === undefined ? instance : `${instance}#${args.slot}`;
			let text = theme.fg("toolTitle", theme.bold("claude "));
			text += theme.fg("accent", `${target}:${args.action}`);
			if (args.task) {
				const task =
					args.task.length > 80 ? `${args.task.slice(0, 80)}…` : args.task;
				text += `\n${theme.fg("dim", task)}`;
			}
			return new Text(text, 0, 0);
		},

		renderResult(result, { isPartial }, theme) {
			const details = result.details as ClaudeToolDetails | undefined;
			if (isPartial) {
				return new Text(
					theme.fg(
						"warning",
						`${details?.slot ?? "Claude"} ${details?.model ?? "starting"} is working…`,
					),
					0,
					0,
				);
			}
			const content = result.content[0];
			const text = content?.type === "text" ? content.text : "(no output)";
			const spend = details?.usage
				? ` · ↑${fmtTokens(details.usage.input + details.usage.cacheRead + details.usage.cacheWrite)} ↓${fmtTokens(details.usage.output)} · $${details.usage.costUsd.toFixed(3)}`
				: "";
			const heading = details?.slot
				? `${details.slot} · ${details.model ?? "model unknown"} · ${details.turns ?? 0} turns${spend}`
				: "Claude agents";
			return new Text(
				`${theme.fg("success", heading)}\n${theme.fg("toolOutput", text)}`,
				0,
				0,
			);
		},
	});

	pi.registerCommand("claude", {
		description: "Claude Code subagents: usage and capacity (add 'stop' to tear them all down)",
		handler: async (args, ctx) => {
			if (args.trim() === "stop") {
				const stopped = (
					await Promise.all([...agents.keys()].map((slot) => stopAgent(slot)))
				).filter(Boolean).length;
				ctx.ui.notify(`Tore down ${stopped} Claude subagent${stopped === 1 ? "" : "s"}.`, "info");
				return;
			}

			const current = statuses();
			const lines = CLAUDE_INSTANCES.map((instance) => {
				const slots = current.filter((status) => status.instance === instance);
				const header = `${instance}  ${slots.length}/${SLOT_LIMITS[instance]} slots`;
				if (slots.length === 0) return `${header}  (idle)`;
				return [
					header,
					...slots.map(
						(status) =>
							`  ${status.slot}  ${status.model ?? "starting"}  ${status.state}  ${status.turns} turns  ↑${fmtTokens(status.usage.input + status.usage.cacheRead + status.usage.cacheWrite)} ↓${fmtTokens(status.usage.output)}  $${status.usage.costUsd.toFixed(3)}  ${(status.usage.durationMs / 1000).toFixed(0)}s`,
					),
				].join("\n");
			});
			ctx.ui.notify(lines.join("\n"), "info");
		},
	});

	pi.on("session_shutdown", async () => {
		await Promise.all([...agents.keys()].map((slot) => stopAgent(slot)));
		setStatus?.(STATUS_KEY, undefined);
		setStatus = undefined;
	});

	pi.on("session_start", (_event, ctx) => {
		setStatus = ctx.ui.setStatus.bind(ctx.ui);
		publishStatus();
	});
}

export default function externalClaudeAgent(pi: ExtensionAPI): void {
	registerExternalClaudeAgent(pi);
}
