/**
 * Forward a message to another session.
 *
 *   <<<< [clipboard]
 *   <<<< have a look at this: [clipboard]
 *   <<<< [last]
 *
 * A prompt starting with `<<<<` never reaches the current model. You pick a
 * target session and the content is delivered there as a prompt, starting a
 * turn in that session.
 *
 * Pi has no inter-process channel — RPC mode is stdin/stdout, not a socket — so
 * delivery goes through an inbox on disk. Sessions drain their own inbox at
 * startup and poll it while running, so a target that is not currently open
 * receives the message the next time it is.
 *
 * See docs/forwarding.md — it is the source of truth for this file.
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const PREFIX = "<<<<";
const POLL_MS = 3000;

interface Envelope {
	from: string;
	fromCwd: string;
	at: string;
	text: string;
}

/**
 * Text wrapped around a forwarded message. Blank by default: a wrapper is a
 * claim about context the receiving model will act on, so it is opt-in.
 * Scoped like Pi's own settings — project file overrides the global one.
 */
interface ForwardConfig {
	prefix: string;
	suffix: string;
}

function loadConfig(cwd: string): ForwardConfig {
	const config: ForwardConfig = { prefix: "", suffix: "" };
	for (const candidate of [
		path.join(agentDir(), "forwarding.json"),
		path.join(cwd, ".pi", "forwarding.json"),
	]) {
		try {
			const parsed = JSON.parse(fs.readFileSync(candidate, "utf-8")) as Partial<ForwardConfig>;
			if (typeof parsed.prefix === "string") config.prefix = parsed.prefix;
			if (typeof parsed.suffix === "string") config.suffix = parsed.suffix;
		} catch {
			// Absent or unreadable; keep whatever the wider scope gave us.
		}
	}
	return config;
}

export function applyWrapper(config: ForwardConfig, envelope: Envelope): string {
	const fill = (template: string) =>
		template
			.replace(/\{from\}/g, envelope.from)
			.replace(/\{cwd\}/g, displayPath(envelope.fromCwd))
			.replace(/\{at\}/g, envelope.at);
	return `${fill(config.prefix)}${envelope.text}${fill(config.suffix)}`;
}

function agentDir(): string {
	return process.env.PI_CODING_AGENT_DIR ?? path.join(process.env.HOME ?? "", ".pi/agent");
}

function inboxDir(): string {
	const dir = path.join(agentDir(), "inbox");
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}

function inboxFor(sessionId: string): string {
	return path.join(inboxDir(), `${sessionId}.jsonl`);
}

function clipboard(): string {
	for (const [command, args] of [
		["wl-paste", ["--no-newline"]],
		["xclip", ["-selection", "clipboard", "-o"]],
		["xsel", ["--clipboard", "--output"]],
	] as [string, string[]][]) {
		try {
			return execFileSync(command, args, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
		} catch {
			// Not installed, or nothing on the clipboard; try the next one.
		}
	}
	return "";
}

interface SessionRow {
	id: string;
	file: string;
	name?: string;
	cwd?: string;
	mtime: number;
}

/**
 * Every session on disk. The header line of a session file carries its id, name
 * and cwd; anything unreadable is skipped rather than failing the picker.
 */
function allSessions(root: string): SessionRow[] {
	const rows: SessionRow[] = [];

	const walk = (dir: string) => {
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(full);
				continue;
			}
			if (!entry.name.endsWith(".jsonl")) continue;

			try {
				const stat = fs.statSync(full);
				// The header carries id and cwd; the name arrives later as a
				// `session_info` entry and can be set more than once, so take the
				// last one. Only the first few lines are read — session files are
				// large and the name is always written early.
				const head = fs.readFileSync(full, "utf-8").split("\n", 12);
				const header = JSON.parse(head[0] ?? "") as { id?: string; cwd?: string };
				if (!header.id) continue;

				let name: string | undefined;
				for (const line of head.slice(1)) {
					if (!line.trim()) continue;
					try {
						const entry = JSON.parse(line) as { type?: string; name?: string };
						if (entry.type === "session_info" && entry.name) name = entry.name;
					} catch {
						// Partial line at the read boundary.
					}
				}

				rows.push({ id: header.id, file: full, name, cwd: header.cwd, mtime: stat.mtimeMs });
			} catch {
				// Not a session file, or truncated.
			}
		}
	};
	walk(root);

	return rows.sort((a, b) => b.mtime - a.mtime);
}

function relativeTime(ms: number): string {
	const minutes = Math.round((Date.now() - ms) / 60000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.round(hours / 24)}d ago`;
}

function displayPath(target: string): string {
	const home = process.env.HOME;
	if (home && target.startsWith(`${home}/`)) return `~/${target.slice(home.length + 1)}`;
	return target;
}

/** Last assistant text in the current branch, for `[last]`. */
function lastAssistantText(ctx: ExtensionContext): string {
	const branch = [...ctx.sessionManager.getBranch()].reverse();
	for (const entry of branch) {
		if (entry.type !== "message" || entry.message.role !== "assistant") continue;
		const message = entry.message as AssistantMessage;
		const text = message.content
			.filter((block) => block.type === "text")
			.map((block) => (block as { text: string }).text)
			.join("\n")
			.trim();
		if (text) return text;
	}
	return "";
}

export default function (pi: ExtensionAPI) {
	// Bound once per session: timers outlive the handler their ctx came from.
	let notify: ((message: string, level: "info" | "warning" | "error") => void) | undefined;
	let myInbox: string | undefined;
	let myCwd: string | undefined;
	let poller: ReturnType<typeof setInterval> | undefined;
	/** Tracked from events: ctx is not valid inside the poll timer. */
	let streaming = false;

	/** Write an envelope into a target session's inbox. */
	const deliver = (targetId: string, envelope: Envelope) => {
		fs.appendFileSync(inboxFor(targetId), `${JSON.stringify(envelope)}\n`, "utf-8");
	};

	const envelopeFrom = (ctx: ExtensionContext, text: string): Envelope => ({
		from: ctx.sessionManager.getSessionName() ?? ctx.sessionManager.getSessionId().slice(0, 8),
		fromCwd: ctx.cwd,
		at: new Date().toISOString().replace("T", " ").slice(0, 16),
		text,
	});

	const drain = () => {
		if (!myInbox || !fs.existsSync(myInbox)) return;
		// Never deliver into a turn in progress. Queuing a message mid-stream
		// depends on an option the runtime does not reliably honour, and a
		// forwarded prompt interleaving with in-flight work is wrong anyway.
		// The poller retries every few seconds, so waiting costs nothing.
		if (streaming) return;

		let raw: string;
		try {
			raw = fs.readFileSync(myInbox, "utf-8");
			// Claim the whole file before delivering, so a second drain cannot
			// deliver the same message twice.
			fs.unlinkSync(myInbox);
		} catch {
			return;
		}

		const config = loadConfig(myCwd ?? process.cwd());

		for (const line of raw.split("\n")) {
			if (!line.trim()) continue;
			let envelope: Envelope;
			try {
				envelope = JSON.parse(line) as Envelope;
			} catch {
				continue;
			}

			// Requeue rather than drop: the inbox file was already claimed, so a
			// failure here would otherwise lose the message silently.
			const requeue = (reason: string) => {
				fs.appendFileSync(myInbox as string, `${JSON.stringify(envelope)}\n`, "utf-8");
				notify?.(`Could not deliver a message from ${envelope.from}; still queued. ${reason}`, "warning");
			};

			try {
				// Wrapper is blank unless configured, so by default the target
				// gets exactly what was forwarded.
				const result = pi.sendUserMessage(applyWrapper(config, envelope)) as unknown;
				// The published signature returns void, but the implementation is
				// async and rejects — a plain try/catch would not see the failure.
				if (result && typeof (result as Promise<void>).catch === "function") {
					(result as Promise<void>).catch((error: unknown) =>
						requeue(error instanceof Error ? error.message : String(error)),
					);
				}
				notify?.(`Forwarded from ${envelope.from}`, "info");
			} catch (error) {
				requeue(error instanceof Error ? error.message : String(error));
			}
		}
	};

	pi.on("session_start", async (_event, ctx) => {
		myCwd = ctx.cwd;

		// A headless run is not a forwarding target: it is already mid-prompt when
		// this fires, it exits when that prompt finishes, and delivering into it
		// would consume a queued message that nobody is there to read. Leaving the
		// inbox untouched keeps the message for the next real session.
		if (!ctx.hasUI) return;

		notify = ctx.ui.notify.bind(ctx.ui);
		myInbox = inboxFor(ctx.sessionManager.getSessionId());
		streaming = !ctx.isIdle();

		if (poller) clearInterval(poller);
		poller = setInterval(drain, POLL_MS);
		drain();
	});

	pi.on("agent_start", async () => {
		streaming = true;
	});
	pi.on("agent_settled", async () => {
		streaming = false;
		// Deliver anything that arrived during the turn without waiting a poll.
		drain();
	});

	pi.on("session_shutdown", async () => {
		if (poller) clearInterval(poller);
		poller = undefined;
	});

	pi.on("input", async (event, ctx) => {
		const text = event.text.trimStart();
		if (!text.startsWith(PREFIX)) return { action: "continue" as const };
		if (!ctx.hasUI) return { action: "continue" as const };

		let payload = text.slice(PREFIX.length).trim();
		if (!payload) payload = "[last]";

		if (payload.includes("[clipboard]")) {
			const contents = clipboard().trim();
			if (!contents) {
				ctx.ui.notify("Clipboard is empty — nothing forwarded.", "warning");
				return { action: "handled" as const };
			}
			payload = payload.replace("[clipboard]", contents);
		}

		if (payload.includes("[last]")) {
			const previous = lastAssistantText(ctx);
			if (!previous) {
				ctx.ui.notify("No assistant message to forward yet.", "warning");
				return { action: "handled" as const };
			}
			payload = payload.replace("[last]", previous);
		}

		const me = ctx.sessionManager.getSessionId();
		const targets = allSessions(ctx.sessionManager.getSessionDir()).filter((row) => row.id !== me);
		if (targets.length === 0) {
			ctx.ui.notify("No other sessions to forward to.", "warning");
			return { action: "handled" as const };
		}

		const labels = targets.map(
			(row) =>
				`${row.name ?? row.id.slice(0, 8)} — ${relativeTime(row.mtime)}${row.cwd ? ` · ${displayPath(row.cwd)}` : ""}`,
		);
		const choice = await ctx.ui.select("Forward to which session?", labels);
		if (!choice) return { action: "handled" as const };

		const target = targets[labels.indexOf(choice)];
		if (!target) return { action: "handled" as const };

		deliver(target.id, envelopeFrom(ctx, payload));

		const preview = payload.split("\n")[0].slice(0, 50);
		ctx.ui.notify(
			`Forwarded to ${target.name ?? target.id.slice(0, 8)}: "${preview}${payload.length > 50 ? "…" : ""}"`,
			"info",
		);

		// Never reaches a model here.
		return { action: "handled" as const };
	});

	// Lets the user say it in a sentence: "tell session spotlight-api this: …".
	pi.registerTool({
		name: "forward_to_session",
		label: "Forward",
		description: [
			"Forward a message to another pi session, where it arrives as a prompt and starts a turn.",
			"Identify the target by its session name, or by its id when it has no name.",
			"The target receives only the text you send — it has no access to this conversation, so include whatever context the message needs to stand alone.",
			"Call with no session to list the available sessions first.",
		].join(" "),
		promptSnippet: "Forward a message to another pi session by name",
		promptGuidelines: [
			"Use forward_to_session when the user asks to tell, send, or forward something to another session.",
			"Never guess between two sessions whose names both plausibly match; list them and ask which.",
		],
		parameters: Type.Object({
			session: Type.Optional(
				Type.String({ description: "Target session name, or id. Omit to list sessions." }),
			),
			message: Type.Optional(
				Type.String({ description: "The message to deliver. Required when session is given." }),
			),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const me = ctx.sessionManager.getSessionId();
			const targets = allSessions(ctx.sessionManager.getSessionDir()).filter((row) => row.id !== me);

			const describe = (row: SessionRow) =>
				`${row.name ?? `(unnamed ${row.id.slice(0, 8)})`} — ${relativeTime(row.mtime)}${row.cwd ? ` · ${displayPath(row.cwd)}` : ""}`;

			if (!params.session) {
				return {
					content: [
						{
							type: "text",
							text:
								targets.length === 0
									? "No other sessions exist."
									: `Sessions:\n${targets.map((row) => `  ${describe(row)}`).join("\n")}`,
						},
					],
				};
			}

			if (!params.message?.trim()) {
				throw new Error('The "message" parameter is required when a session is given.');
			}

			const wanted = params.session.trim().toLowerCase();
			const byName = targets.filter((row) => row.name?.toLowerCase() === wanted);
			const byPrefix = targets.filter(
				(row) => row.name?.toLowerCase().includes(wanted) || row.id.startsWith(wanted),
			);
			const matches = byName.length > 0 ? byName : byPrefix;

			if (matches.length === 0) {
				throw new Error(
					`No session matches "${params.session}". Available:\n${targets.map((row) => `  ${describe(row)}`).join("\n")}`,
				);
			}
			if (matches.length > 1) {
				// Delivering to the wrong session is not recoverable from here.
				throw new Error(
					`"${params.session}" matches ${matches.length} sessions; ask the user which one:\n${matches.map((row) => `  ${describe(row)}`).join("\n")}`,
				);
			}

			const target = matches[0];
			deliver(target.id, envelopeFrom(ctx, params.message));

			return {
				content: [
					{
						type: "text",
						text: `Forwarded to ${target.name ?? target.id.slice(0, 8)}. It will arrive within a few seconds if that session is open, or when it is next opened.`,
					},
				],
			};
		},
	});
}
