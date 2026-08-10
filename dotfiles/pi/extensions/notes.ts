/**
 * /notes — a mode where what you type is written down instead of answered.
 *
 * While notes mode is on, every prompt is intercepted and appended to a notes
 * file. Nothing reaches a model, nothing enters the session, nothing is billed.
 * It is for thinking out loud mid-task without derailing the conversation or
 * polluting the context window.
 *
 *   /notes           toggle the mode
 *   /notes show      print this project's notes
 *   /notes path      where the file is
 *   /notes open      open it in $EDITOR
 *
 * Notes are per working directory, under `<agent dir>/notes/`.
 *
 * See docs/notes.md — it is the source of truth for this file.
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

function agentDir(): string {
	return process.env.PI_CODING_AGENT_DIR ?? path.join(process.env.HOME ?? "", ".pi/agent");
}

function notesDir(): string {
	const dir = path.join(agentDir(), "notes");
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}

/** One notes file per working directory, named after it. */
function notesFile(cwd: string): string {
	const slug = cwd.replace(/^\//, "").replace(/[^A-Za-z0-9._-]+/g, "-") || "root";
	return path.join(notesDir(), `${slug}.md`);
}

export default function (pi: ExtensionAPI) {
	let taking = false;

	const showStatus = (ctx: ExtensionContext) => {
		ctx.ui.setStatus("notes", taking ? ctx.ui.theme.fg("warning", "notes") : undefined);
	};

	const append = (cwd: string, text: string): string => {
		const file = notesFile(cwd);
		const stamp = new Date().toISOString().replace("T", " ").slice(0, 16);
		const body = text.trimEnd();

		if (!fs.existsSync(file)) {
			fs.writeFileSync(file, `# Notes — ${cwd}\n`, "utf-8");
		}
		fs.appendFileSync(file, `\n## ${stamp}\n\n${body}\n`, "utf-8");
		return file;
	};

	// Switching sessions turns notes mode off: silently swallowing the first
	// prompt of a new conversation would be a nasty surprise.
	pi.on("session_start", async (event, ctx) => {
		if (event.reason !== "startup") taking = false;
		showStatus(ctx);
	});

	pi.on("input", async (event, ctx) => {
		// A message released by send-hold was typed before its current mode;
		// do not reinterpret extension-injected input as a new note.
		if (event.source === "extension" || !taking) return { action: "continue" as const };

		const text = event.text.trim();
		// Commands still work while the mode is on, otherwise you could not leave it.
		if (!text || text.startsWith("/")) return { action: "continue" as const };

		append(ctx.cwd, event.text);
		const lines = text.split("\n").length;
		ctx.ui.notify(`Noted (${lines} line${lines === 1 ? "" : "s"}). Not sent to a model.`, "info");

		// Swallowed: no message, no turn, no tokens.
		return { action: "handled" as const };
	});

	pi.registerCommand("notes", {
		description: "Notes mode: typed input is logged, not sent (show | path | open)",
		handler: async (args, ctx) => {
			const requested = args.trim();
			const file = notesFile(ctx.cwd);

			if (requested === "path") {
				ctx.ui.notify(file, "info");
				return;
			}

			if (requested === "show") {
				ctx.ui.notify(
					fs.existsSync(file) ? fs.readFileSync(file, "utf-8").slice(-8000) : "No notes for this directory yet.",
					"info",
				);
				return;
			}

			if (requested === "open") {
				if (!fs.existsSync(file)) append(ctx.cwd, "(created)");
				const editor = process.env.VISUAL ?? process.env.EDITOR ?? "nvim";
				await pi.exec(editor, [file]).catch(() => ctx.ui.notify(`Could not open ${file}`, "error"));
				return;
			}

			taking = !taking;
			showStatus(ctx);
			ctx.ui.notify(
				taking
					? `Notes mode on — what you type goes to ${file}, not to a model.`
					: "Notes mode off — prompts go to the model again.",
				"info",
			);
		},
	});
}
