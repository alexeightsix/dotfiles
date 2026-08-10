/**
 * Statusline
 *
 * Replaces pi's built-in footer with a single line:
 *
 *   model:thinking  perm:ask  plan   ↑12k ↓3.4k  $0.184  ctx 18% · 812k left  4m07s  ⎇ main
 *
 * Left  — what the agent is right now (model, thinking level, extension statuses
 *         such as the permission mode and plan mode).
 * Right — what it has cost so far (tokens spent, dollars, context remaining,
 *         elapsed time) plus the git branch.
 *
 * Everything is one line. When the terminal is too narrow the left side is
 * truncated first, so the spend numbers stay readable.
 */

import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const SEP = "  ";

/** Braille spinner: the working indicator, shown only while a turn is live. */
const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function fmtTokens(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 10_000) return `${Math.round(n / 1000)}k`;
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return `${n}`;
}

/**
 * Each model gets its own colour so the active one is recognisable at a glance
 * without reading the name. Known models are pinned by family; anything else is
 * hashed onto the same palette, which keeps a given model's colour stable
 * between sessions.
 */
/* Rose-pine collapses to five usable hues: iris, foam, gold, love, rose. */
const MODEL_PALETTE = ["accent", "success", "warning", "error", "syntaxFunction", "muted"] as const;

const MODEL_COLORS: Record<string, string> = {
	"gpt-5.6-sol": "success",
	"gpt-5.6-terra": "accent",
	"gpt-5.6-luna": "accent",
	"gpt-5.5": "muted",
	claude: "warning",
	claude2: "syntaxFunction",
	"kimi-k3": "error",
	"deepseek-v4-flash": "muted",
};

function modelColor(id: string): string {
	const pinned = MODEL_COLORS[id];
	if (pinned) return pinned;
	let hash = 0;
	for (let index = 0; index < id.length; index++) hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
	return MODEL_PALETTE[hash % MODEL_PALETTE.length];
}

/** Shorten a path for display: `~/dev/spotlight`. */
function displayPath(target: string): string {
	const home = process.env.HOME;
	if (home && target === home) return "~";
	if (home && target.startsWith(`${home}/`)) return `~/${target.slice(home.length + 1)}`;
	return target;
}

function fmtDuration(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
	if (m > 0) return `${m}m${String(s).padStart(2, "0")}s`;
	return `${s}s`;
}

export default function (pi: ExtensionAPI) {
	let sessionStart = Date.now();
	let turnStart: number | null = null;
	/** /zen hides the line entirely. */
	let hidden = false;
	let requestRender: (() => void) | undefined;

	pi.registerCommand("zen", {
		description: "Hide or show the statusline",
		handler: async (_args, ctx) => {
			hidden = !hidden;
			requestRender?.();
			ctx.ui.notify(hidden ? "Statusline hidden. /zen to bring it back." : "Statusline back.", "info");
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		sessionStart = Date.now();
		turnStart = null;

		// Only the TUI has a footer to replace.
		if (ctx.mode !== "tui") return;

		// The spinner lives in the statusline, so hide Pi's own streaming loader.
		// Two working indicators for one turn is just noise.
		ctx.ui.setWorkingIndicator({ frames: [] });

		ctx.ui.setFooter((tui, theme, footerData) => {
			const unsubscribe = footerData.onBranchChange(() => tui.requestRender());
			requestRender = () => tui.requestRender();
			// Keep the elapsed timer moving while the agent is working. Idle
			// sessions do not re-render, so this costs nothing between turns.
			// Fast enough for the spinner to read as motion; only runs mid-turn,
			// so an idle session does not re-render at all.
			const ticker = setInterval(() => {
				if (turnStart !== null) tui.requestRender();
			}, 100);

			return {
				dispose() {
					unsubscribe();
					clearInterval(ticker);
				},
				invalidate() {},
				render(width: number): string[] {
					if (hidden) return [];

					let input = 0;
					let output = 0;
					let cost = 0;
					let cacheRead = 0;
					for (const entry of ctx.sessionManager.getBranch()) {
						if (entry.type !== "message" || entry.message.role !== "assistant") continue;
						const message = entry.message as AssistantMessage;
						input += message.usage.input + message.usage.cacheRead + message.usage.cacheWrite;
						output += message.usage.output;
						cacheRead += message.usage.cacheRead;
						cost += message.usage.cost.total;
					}

					/*
					 * Ordered most important to least, left to right.
					 *
					 * Leftmost is what you glance at mid-task: is it working, is it
					 * allowed to change things, what is it costing. Rightmost is
					 * context you already know — which directory, which branch — and
					 * the clock, which matters least of all because it only tells you
					 * something after the fact.
					 */
					const statuses = footerData.getExtensionStatuses();

					const left: string[] = [];
					// Padded so the spinner does not sit flush against the terminal
					// edge, and so the line does not shift when it appears.
					left.push(
						turnStart !== null
							? theme.fg("accent", ` ${SPINNER[Math.floor(Date.now() / 100) % SPINNER.length]}`)
							: "  ",
					);

					const permission = statuses.get("permission-mode");
					if (permission) left.push(permission);

					// Anything demanding a decision — a held send, a spend cap, todo
					// progress, claude subagents — outranks passive information.
					for (const [key, status] of statuses) {
						if (!status || key === "permission-mode" || key === "mcp") continue;
						left.push(status);
					}

					const model = ctx.model;
					if (model) {
						const thinking = ctx.thinkingLevel && ctx.thinkingLevel !== "off" ? `:${ctx.thinkingLevel}` : "";
						left.push(theme.fg(modelColor(model.id), model.id) + theme.fg("dim", thinking));
					} else {
						left.push(theme.fg("error", "no model"));
					}

					left.push(theme.fg("dim", `↑${fmtTokens(input)} ↓${fmtTokens(output)}`));

					// Share of input served from cache. A number that collapses after
					// a model switch is expected — caches are per-provider.
					if (input > 0) {
						const hit = Math.round((cacheRead / input) * 100);
						left.push(theme.fg(hit >= 50 ? "success" : "dim", `cache ${hit}%`));
					}

					// Money gets its own hue, and two decimals — the third never
					// changed a decision and cost a column.
					left.push(theme.fg("syntaxFunction", `$${cost.toFixed(2)}`));

					const usage = ctx.getContextUsage();
					if (usage && usage.tokens !== null && usage.percent !== null) {
						const remaining = Math.max(0, usage.contextWindow - usage.tokens);
						// Coloured by how much room is left, not how much is used.
						const percentLeft = 100 - usage.percent;
						const color = percentLeft >= 50 ? "success" : percentLeft >= 20 ? "warning" : "error";
						left.push(
							theme.fg(color, `ctx ${Math.round(usage.percent)}%/${fmtTokens(usage.contextWindow)}`) +
								theme.fg("dim", ` ${fmtTokens(remaining)} left`),
						);
					}

					// Least important, outermost: things you already know, then the
					// clock, which only tells you something after the fact.
					const right: string[] = [];

					const branch = footerData.getGitBranch();
					if (branch) right.push(theme.fg("dim", `⎇ ${branch}`));

					right.push(theme.fg("dim", displayPath(ctx.cwd)));

					const mcp = statuses.get("mcp");
					if (mcp) right.push(mcp);

					const elapsed = turnStart !== null ? Date.now() - turnStart : Date.now() - sessionStart;
					right.push(theme.fg(turnStart !== null ? "accent" : "dim", fmtDuration(elapsed)));

					const leftText = left.join(SEP);
					const rightText = right.join(SEP);
					const gap = width - visibleWidth(leftText) - visibleWidth(rightText);
					if (gap >= 2) {
						return [leftText + " ".repeat(gap) + rightText];
					}
					// Too narrow for both: the left holds everything that matters, so
					// drop the right entirely rather than losing spend figures to
					// keep a directory path on screen.
					return [truncateToWidth(leftText, width)];
				},
			};
		});
	});

	pi.on("turn_start", async () => {
		turnStart = Date.now();
	});

	pi.on("turn_end", async () => {
		turnStart = null;
	});
}
