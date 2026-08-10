/**
 * /improve — hand this Pi configuration to a fresh agent and let it critique itself.
 *
 *   /improve [notes]   spawn an improver with its own context and its own session
 *   /improve view      open a past improver conversation, rendered as HTML
 *   /improve list      list past improver conversations
 *
 * The improver is a separate `pi` process, so it gets a clean context window, its
 * own model/thinking budget, and its own tool history — nothing leaks into the
 * session you ran it from.
 *
 * Its sessions are written to a dedicated directory (`<agent dir>/improve`), which
 * is what makes them viewable in isolation later: `/improve view` only ever sees
 * improver conversations, never your normal work.
 *
 * Inside tmux the improver opens in its own window so you can watch it live and
 * scroll back through the whole conversation. Outside tmux it runs headless and
 * the transcript is still recorded to the same place.
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

const CONFIG_DIR = path.join(process.env.HOME ?? "", "kickstart/dotfiles/pi");

function agentDir(): string {
	return process.env.PI_CODING_AGENT_DIR ?? path.join(process.env.HOME ?? "", ".pi/agent");
}

function improveDir(): string {
	const dir = path.join(agentDir(), "improve");
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}

function stamp(): string {
	return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

/** Every .jsonl under the improve session dir, newest first. */
function improveSessions(): { file: string; label: string }[] {
	const root = improveDir();
	const found: { file: string; mtime: number }[] = [];

	const walk = (dir: string) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (entry.name.endsWith(".jsonl")) found.push({ file: full, mtime: fs.statSync(full).mtimeMs });
		}
	};
	walk(root);

	return found
		.sort((a, b) => b.mtime - a.mtime)
		.map(({ file, mtime }) => ({
			file,
			label: `${new Date(mtime).toLocaleString()}  ${path.basename(file)}`,
		}));
}

function brief(notes: string): string {
	return [
		`Review and improve the Pi configuration in ${CONFIG_DIR}.`,
		"",
		`THE DOCUMENTATION IS THE SOURCE OF TRUTH, NOT THE CODE. The Docusaurus site in`,
		`${path.join(CONFIG_DIR, "docs")} documents how this editor is configured and used.`,
		"Work in this order: check the documentation, update it when behaviour should change,",
		"then change the code to match. Where the code and the docs disagree, the code is the",
		"defect — fix the code, or, if the docs are the ones that are stale, say so explicitly",
		"in your report rather than quietly rewriting them to match the code.",
		"",
		"Never edit a docs page without adding an entry to docs/docs/changelog.md that states",
		"WHY you changed it. What changed is recoverable from git; why it changed is not.",
		"",
		"That directory is the tracked config; it is symlinked into the global Pi agent",
		`directory (${agentDir()}) by its own link.sh. Read the docs first, then every file`,
		"there — settings.json, keybindings.json, mcp.json, the extensions, and the skills —",
		"plus the installed pi docs under the pi-coding-agent package, so your suggestions",
		"match the version actually installed rather than what you remember of the API.",
		"",
		"Look for:",
		"- settings that are stale, redundant, or contradicted by another setting",
		"- extensions that use an API that has changed, or that would throw at runtime",
		"- keybindings that collide with a built-in binding or with each other",
		"- capabilities this pi version offers that the config does not use yet",
		"- anything that would break on a fresh machine following kickstart",
		"",
		"Rules:",
		"- You may edit files inside the config directory. Run its link.sh after adding a file.",
		"- Do not commit, push, or touch anything outside the config directory.",
		"- Verify a claim against the installed package before acting on it.",
		"- Run ./tests/e2e.sh before reporting anything as working. Add a unit test to",
		"  tests/unit.test.ts for any pure logic you add, putting the logic in lib/ so it",
		"  is importable without a pi process.",
		"- For anything that renders, VERIFY IT IN TMUX. `tmux capture-pane -p -t <pane>`",
		"  shows the live session. Padding, alignment, colour and duplicated indicators are",
		"  invisible headlessly and obvious in a capture. Do not claim a visual change works",
		"  without having looked at it.",
		"",
		"Finish with a short report: what you changed, and what you recommend but did not do.",
		notes.trim() ? `\nThe user also asked you to focus on: ${notes.trim()}` : "",
	].join("\n");
}

export default function (pi: ExtensionAPI) {
	const spawnImprover = async (notes: string, ctx: ExtensionCommandContext) => {
		const dir = improveDir();
		const name = `improve-${stamp()}`;
		const args = ["--session-dir", dir, "--name", name, brief(notes)];

		if (process.env.TMUX) {
			// A tmux window is the scoped view: the whole conversation stays on screen
			// and in scrollback, separate from whatever this session is doing.
			const command = `pi ${args.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(" ")}; exec ${process.env.SHELL ?? "bash"}`;
			await pi.exec("tmux", ["new-window", "-n", "pi-improve", "-c", CONFIG_DIR, command]);
			ctx.ui.notify(`Improver running in tmux window 'pi-improve' (session ${name})`, "info");
			return;
		}

		const log = path.join(dir, `${name}.log`);
		const child = spawn("pi", ["--print", ...args], {
			cwd: CONFIG_DIR,
			detached: true,
			stdio: ["ignore", fs.openSync(log, "a"), fs.openSync(log, "a")],
		});
		child.unref();
		ctx.ui.notify(`Improver running headless. Output: ${log}`, "info");
	};

	const viewSession = async (ctx: ExtensionCommandContext) => {
		const sessions = improveSessions();
		if (sessions.length === 0) {
			ctx.ui.notify("No improver conversations yet. Run /improve first.", "warning");
			return;
		}

		const choice = await ctx.ui.select("Improver conversation", sessions.map((s) => s.label));
		if (!choice) return;
		const chosen = sessions.find((s) => s.label === choice);
		if (!chosen) return;

		const html = chosen.file.replace(/\.jsonl$/, ".html");
		const result = await pi.exec("pi", ["--session", chosen.file, "--export", html]);
		if (result.exitCode !== 0) {
			ctx.ui.notify(`Export failed: ${result.stderr.trim() || result.stdout.trim()}`, "error");
			return;
		}
		await pi.exec("xdg-open", [html]).catch(() => undefined);
		ctx.ui.notify(`Opened ${html}`, "info");
	};

	pi.registerCommand("improve", {
		description: "Spawn a fresh agent to improve this Pi config (view | list | <notes>)",
		handler: async (args, ctx) => {
			const input = args.trim();

			if (input === "view") return viewSession(ctx);

			if (input === "list") {
				const sessions = improveSessions();
				ctx.ui.notify(
					sessions.length === 0
						? "No improver conversations yet."
						: sessions.map((s) => s.label).join("\n"),
					"info",
				);
				return;
			}

			await spawnImprover(input, ctx);
		},
	});
}
