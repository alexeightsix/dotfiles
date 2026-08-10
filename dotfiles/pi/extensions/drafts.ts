/**
 * /draft — keep prompts you are not ready to send.
 *
 * Some prompts are worth composing carefully, or worth reusing. This stores
 * them as plain Markdown and loads them straight back into the editor.
 *
 *   /draft              save what is in the editor, or pick one to load if empty
 *   /draft <name>       save the editor under that name
 *   /draft list         show every draft
 *   /draft delete       pick one to remove
 *
 * See docs/drafts.md — it is the source of truth for this file.
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

import { slugify } from "../lib/parse.ts";

function agentDir(): string {
	return process.env.PI_CODING_AGENT_DIR ?? path.join(process.env.HOME ?? "", ".pi/agent");
}

function draftsDir(): string {
	const dir = path.join(agentDir(), "drafts");
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}



interface Draft {
	slug: string;
	name: string;
	cwd: string;
	body: string;
	mtime: number;
}

function load(): Draft[] {
	const dir = draftsDir();
	const out: Draft[] = [];
	for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".md"))) {
		try {
			const full = path.join(dir, file);
			const raw = fs.readFileSync(full, "utf-8");
			const stat = fs.statSync(full);
			// A two-line header keeps the file readable and editable by hand.
			const match = raw.match(/^<!--\s*name:\s*(.*?)\s*\|\s*cwd:\s*(.*?)\s*-->\n?/);
			out.push({
				slug: file.replace(/\.md$/, ""),
				name: match?.[1] ?? file.replace(/\.md$/, ""),
				cwd: match?.[2] ?? "",
				body: match ? raw.slice(match[0].length) : raw,
				mtime: stat.mtimeMs,
			});
		} catch {
			// Unreadable; skip rather than fail the picker.
		}
	}
	return out.sort((a, b) => b.mtime - a.mtime);
}

function displayPath(target: string): string {
	const home = process.env.HOME;
	if (home && target.startsWith(`${home}/`)) return `~/${target.slice(home.length + 1)}`;
	return target;
}

function relativeTime(ms: number): string {
	const minutes = Math.round((Date.now() - ms) / 60000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.round(hours / 24)}d ago`;
}

export default function (pi: ExtensionAPI) {
	/**
	 * The draft currently loaded in the editor. Saving again with no name
	 * updates it in place rather than making a near-duplicate, which is what
	 * "edit it without sending" needs to actually work.
	 */
	let active: { slug: string; name: string } | undefined;

	// Once a prompt is actually sent, the editor is no longer editing a draft.
	pi.on("input", async (event) => {
		if (event.source !== "extension" && !event.text.trimStart().startsWith("/")) active = undefined;
		return { action: "continue" as const };
	});

	const save = (name: string, body: string, cwd: string): string => {
		const slug = slugify(name);
		fs.writeFileSync(
			path.join(draftsDir(), `${slug}.md`),
			`<!-- name: ${name} | cwd: ${cwd} -->\n${body}`,
			"utf-8",
		);
		return slug;
	};

	const pick = async (ctx: ExtensionCommandContext, title: string): Promise<Draft | undefined> => {
		const drafts = load();
		if (drafts.length === 0) {
			ctx.ui.notify("No drafts yet. Type a prompt and run /draft to keep it.", "info");
			return undefined;
		}
		const labels = drafts.map(
			(draft) =>
				`${draft.name} — ${relativeTime(draft.mtime)}${draft.cwd ? ` · ${displayPath(draft.cwd)}` : ""}`,
		);
		const choice = await ctx.ui.select(title, labels);
		if (!choice) return undefined;
		return drafts[labels.indexOf(choice)];
	};

	pi.registerCommand("draft", {
		description: "Save the editor as a draft prompt, or load one back (list | delete)",
		handler: async (args, ctx) => {
			const requested = args.trim();
			const editor = ctx.ui.getEditorText().trim();

			if (requested === "list") {
				const drafts = load();
				ctx.ui.notify(
					drafts.length === 0
						? "No drafts."
						: drafts
								.map(
									(draft) =>
										`${draft.name}  ${relativeTime(draft.mtime)}\n  ${draft.body.trim().split("\n")[0].slice(0, 70)}`,
								)
								.join("\n"),
					"info",
				);
				return;
			}

			if (requested === "delete") {
				const draft = await pick(ctx, "Delete which draft?");
				if (!draft) return;
				fs.unlinkSync(path.join(draftsDir(), `${draft.slug}.md`));
				ctx.ui.notify(`Deleted draft "${draft.name}".`, "info");
				return;
			}

			// Editor has text: keep it. This is the common case — you typed
			// something, then decided it was not ready.
			if (editor) {
				// Updating in place only when no name was given and one is loaded;
				// an explicit name always forks rather than overwrites.
				const updating = !requested && active !== undefined;
				const name = requested || active?.name || editor.split("\n")[0].slice(0, 48);
				const slug = save(name, `${editor}\n`, ctx.cwd);
				active = { slug, name };
				ctx.ui.setEditorText("");
				ctx.ui.notify(
					updating ? `Updated draft "${name}".` : `Saved draft "${name}". /draft to load it back.`,
					"info",
				);
				return;
			}

			// Editor is empty: retrieve one. A named argument picks it directly,
			// otherwise choose from the list.
			let draft: Draft | undefined;
			if (requested) {
				draft = load().find(
					(candidate) =>
						candidate.slug === slugify(requested) ||
						candidate.name.toLowerCase() === requested.toLowerCase(),
				);
				if (!draft) {
					ctx.ui.notify(`No draft named "${requested}". /draft list to see them.`, "warning");
					return;
				}
			} else {
				draft = await pick(ctx, "Which draft?");
				if (!draft) return;
			}

			const action = await ctx.ui.select(`"${draft.name}"`, [
				"Edit it — load into the editor, stays saved",
				"Send it now",
			]);
			if (!action) return;

			if (action.startsWith("Send")) {
				// Goes through the normal path, so the send hold still applies.
				pi.sendUserMessage(draft.body.trimEnd());
				active = undefined;
				ctx.ui.notify(`Sent "${draft.name}". Still saved as a draft.`, "info");
				return;
			}

			ctx.ui.setEditorText(draft.body.trimEnd());
			active = { slug: draft.slug, name: draft.name };
			ctx.ui.notify(`Loaded "${draft.name}". /draft saves your edits back to it.`, "info");
		},
	});
}
