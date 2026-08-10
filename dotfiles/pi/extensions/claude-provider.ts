/**
 * Claude Code as a selectable model.
 *
 *   claude-code/claude    the 5x Max account
 *   claude-code/claude2   the 1x account
 *
 * Selecting one makes Claude Code the primary orchestrator for the turn: it
 * plans, runs its own tools, and returns the result. Pi owns the conversation
 * and replays the whole history into a fresh `claude --print` process each
 * turn, so the thread survives switching models mid-session.
 *
 * This is a different thing from the `claude` *tool* in external-claude-agent.ts,
 * which stays available under any model and spawns read-only subagents. See
 * docs/claude-as-model.md — it is the source of truth for this file.
 */

import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";

import {
	type AssistantMessage,
	type AssistantMessageEventStream,
	type Context,
	createAssistantMessageEventStream,
	type Model,
	type SimpleStreamOptions,
} from "@earendil-works/pi-ai/compat";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const BINARIES = ["claude", "claude2"] as const;
type Binary = (typeof BINARIES)[number];

const READ_ONLY_TOOLS = "Read,Grep,Glob,Bash";
const READ_ONLY_ALLOWLIST = [
	"Read",
	"Grep",
	"Glob",
	"Bash(git status *)",
	"Bash(git diff *)",
	"Bash(git log *)",
	"Bash(git show *)",
	"Bash(ls *)",
	"Bash(pwd)",
].join(",");

/**
 * Pi's permission mode, mirrored off the event bus by permission-modes.ts.
 * Only `read-only` changes what we spawn — see the docs page for why `ask`
 * does not mean Claude will ask.
 */
let permissionMode = "ask";

function onPath(binary: string): boolean {
	try {
		execFileSync("command", ["-v", binary], { shell: true, stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

/** Render one of Pi's messages as a transcript block Claude can read. */
function renderMessage(message: Context["messages"][number]): string {
	const parts: string[] = [];
	const content = (message as { content?: unknown }).content;

	if (typeof content === "string") {
		parts.push(content);
	} else if (Array.isArray(content)) {
		for (const block of content) {
			if (!block || typeof block !== "object") continue;
			const typed = block as { type?: string; text?: string; name?: string; arguments?: unknown; output?: unknown };
			switch (typed.type) {
				case "text":
					if (typed.text) parts.push(typed.text);
					break;
				case "toolCall":
					parts.push(`[called ${typed.name}: ${JSON.stringify(typed.arguments ?? {})}]`);
					break;
				case "toolResult":
					parts.push(`[tool result: ${JSON.stringify(typed.output ?? "").slice(0, 2000)}]`);
					break;
				case "image":
					parts.push("[image omitted]");
					break;
				case "thinking":
					// Another provider's reasoning does not transfer.
					break;
			}
		}
	}

	const body = parts.join("\n").trim();
	if (!body) return "";
	return `<${message.role}>\n${body}\n</${message.role}>`;
}

/**
 * Claude Code is stateless here: one process per turn, whole history replayed.
 * The final user turn is the actual instruction; everything before it is context.
 */
function buildPrompt(context: Context): string {
	const rendered = context.messages.map(renderMessage).filter(Boolean);
	if (rendered.length <= 1) {
		return rendered[0]?.replace(/^<user>\n|\n<\/user>$/g, "") ?? "";
	}

	const history = rendered.slice(0, -1).join("\n\n");
	const latest = rendered[rendered.length - 1];
	return [
		"You are continuing an existing conversation. Earlier turns:",
		"",
		"<conversation>",
		history,
		"</conversation>",
		"",
		"Respond to the latest turn:",
		"",
		latest,
	].join("\n");
}

function argsFor(context: Context): string[] {
	const args = [
		"--print",
		"--output-format",
		"stream-json",
		"--include-partial-messages",
		"--verbose",
		"--no-session-persistence",
	];

	if (permissionMode === "read-only") {
		args.push(
			"--safe-mode",
			"--permission-mode",
			"dontAsk",
			"--tools",
			READ_ONLY_TOOLS,
			"--allowedTools",
			READ_ONLY_ALLOWLIST,
		);
	} else {
		// Claude runs its own tool loop; Pi cannot gate it mid-turn.
		args.push("--permission-mode", "acceptEdits");
	}

	if (context.systemPrompt) {
		args.push("--append-system-prompt", context.systemPrompt);
	}

	return args;
}

function streamClaudeCode(
	model: Model<any>,
	context: Context,
	options?: SimpleStreamOptions,
): AssistantMessageEventStream {
	const stream = createAssistantMessageEventStream();

	void (async () => {
		const output: AssistantMessage = {
			role: "assistant",
			content: [],
			api: model.api,
			provider: model.provider,
			model: model.id,
			usage: {
				input: 0,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0,
				totalTokens: 0,
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
			},
			stopReason: "pending",
			timestamp: Date.now(),
		};

		try {
			stream.push({ type: "start", partial: output });

			const child = spawn(model.id, [...argsFor(context), buildPrompt(context)], {
				cwd: process.cwd(),
				env: { ...process.env },
				stdio: ["ignore", "pipe", "pipe"],
			});

			const abort = () => child.kill("SIGTERM");
			options?.signal?.addEventListener("abort", abort, { once: true });

			let contentIndex = -1;
			let text = "";
			let stdoutBuffer = "";
			let stderr = "";

			const openTextBlock = () => {
				if (contentIndex >= 0) return;
				output.content.push({ type: "text", text: "" });
				contentIndex = output.content.length - 1;
				stream.push({ type: "text_start", contentIndex, partial: output });
			};

			const pushDelta = (delta: string) => {
				if (!delta) return;
				openTextBlock();
				text += delta;
				const block = output.content[contentIndex];
				if (block.type === "text") block.text = text;
				stream.push({ type: "text_delta", contentIndex, delta, partial: output });
			};

			const handleLine = (line: string) => {
				if (!line.trim()) return;
				let event: Record<string, unknown>;
				try {
					event = JSON.parse(line) as Record<string, unknown>;
				} catch {
					return;
				}

				// Partial text as Claude writes it.
				if (event.type === "stream_event") {
					const inner = event.event as { delta?: { type?: string; text?: string } } | undefined;
					if (inner?.delta?.type === "text_delta" && inner.delta.text) {
						pushDelta(inner.delta.text);
					}
					return;
				}

				// A complete assistant message. Only used when partials were absent,
				// otherwise it would duplicate what the deltas already streamed.
				if (event.type === "assistant" && !text) {
					const message = event.message as { content?: unknown } | undefined;
					const blocks = Array.isArray(message?.content) ? message.content : [];
					for (const block of blocks) {
						const typed = block as { type?: string; text?: string };
						if (typed.type === "text" && typed.text) pushDelta(typed.text);
					}
					return;
				}

				if (event.type !== "result") return;

				// Real reported usage, not an estimate from a price table.
				const usage = event.usage as Record<string, unknown> | undefined;
				const read = (key: string) =>
					usage && typeof usage[key] === "number" ? (usage[key] as number) : 0;
				output.usage.input = read("input_tokens");
				output.usage.output = read("output_tokens");
				output.usage.cacheRead = read("cache_read_input_tokens");
				output.usage.cacheWrite = read("cache_creation_input_tokens");
				output.usage.totalTokens =
					output.usage.input + output.usage.output + output.usage.cacheRead + output.usage.cacheWrite;
				if (typeof event.total_cost_usd === "number") {
					output.usage.cost.total = event.total_cost_usd;
					output.usage.cost.output = event.total_cost_usd;
				}

				if (!text && typeof event.result === "string") pushDelta(event.result);
				output.stopReason = event.is_error ? "error" : "stop";
				if (event.is_error) {
					output.errorMessage =
						typeof event.error === "string" ? event.error : "Claude Code reported an error";
				}
			};

			child.stdout.on("data", (chunk: Buffer) => {
				stdoutBuffer += chunk.toString();
				const lines = stdoutBuffer.split("\n");
				stdoutBuffer = lines.pop() ?? "";
				for (const line of lines) handleLine(line);
			});
			child.stderr.on("data", (chunk: Buffer) => {
				stderr = (stderr + chunk.toString()).slice(-8000);
			});

			const exit = await new Promise<{ code: number | null; error?: Error }>((resolve) => {
				child.on("error", (error: Error) => resolve({ code: null, error }));
				child.on("close", (code: number | null) => resolve({ code }));
			});

			options?.signal?.removeEventListener("abort", abort);
			if (stdoutBuffer.trim()) handleLine(stdoutBuffer);

			if (exit.error) throw new Error(`Could not start ${model.id}: ${exit.error.message}`);

			if (contentIndex >= 0) {
				stream.push({ type: "text_end", contentIndex, content: text, partial: output });
			}

			if (output.stopReason === "pending") {
				if (options?.signal?.aborted) {
					output.stopReason = "aborted";
					throw new Error(`${model.id} was aborted`);
				}
				throw new Error(
					`${model.id} exited (${exit.code ?? "unknown"}) without a result: ${stderr.trim() || "no output"}`,
				);
			}
			if (output.stopReason === "error") {
				throw new Error(output.errorMessage || "Claude Code reported an error");
			}

			stream.push({ type: "done", reason: output.stopReason, message: output });
			stream.end();
		} catch (error) {
			output.stopReason = options?.signal?.aborted ? "aborted" : "error";
			output.errorMessage = error instanceof Error ? error.message : String(error);
			stream.push({ type: "error", reason: output.stopReason, error: output });
			stream.end();
		}
	})();

	return stream;
}

export default function (pi: ExtensionAPI) {
	const available = BINARIES.filter((binary) => onPath(binary));
	if (available.length === 0) return;

	pi.events.on("perm:mode", (data) => {
		const mode = (data as { mode?: string })?.mode;
		if (typeof mode === "string") permissionMode = mode;
	});

	pi.registerProvider("claude-code", {
		name: "Claude Code",
		baseUrl: "local",
		apiKey: "local",
		api: "claude-code-cli",
		streamSimple: streamClaudeCode,
		models: available.map((binary: Binary) => ({
			id: binary,
			name: binary === "claude" ? "Claude Code (5x Max)" : "Claude Code (1x)",
			reasoning: false,
			input: ["text"] as ("text" | "image")[],
			// Billed against the subscription; real cost arrives with each result event.
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 1_000_000,
			maxTokens: 64_000,
		})),
	});
}
