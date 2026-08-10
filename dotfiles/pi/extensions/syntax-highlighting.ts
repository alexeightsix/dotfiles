/**
 * Syntax highlighting for rendered code.
 *
 * - Bash tool-call commands use Pi's syntax palette instead of one flat colour.
 * - Embedded heredoc bodies switch to their interpreter/file/delimiter language.
 * - Unlabelled Markdown fences get a conservative render-only language label.
 *
 * Execution, output rendering, truncation, timing and prompt metadata remain
 * Pi's built-in Bash implementation; this extension replaces only renderCall.
 *
 * See docs/code-rendering.md — it is the source of truth for this file.
 */

import {
	copyToClipboard,
	createBashToolDefinition,
	highlightCode,
	type ExtensionAPI,
	type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

import { latestCodeSnippet } from "../lib/snippet.ts";
import { annotateUnlabelledFences, splitShellLanguages } from "../lib/syntax.ts";

export default function (pi: ExtensionAPI) {
	pi.registerMarkdownTransformer(annotateUnlabelledFences);

	const copyLatest = async (ctx: ExtensionContext) => {
		const code = latestCodeSnippet(ctx.sessionManager.getBranch());
		if (!code) {
			ctx.ui.notify("No Bash command or fenced code block to copy.", "info");
			return;
		}
		try {
			await copyToClipboard(code);
			ctx.ui.notify("Copied the most recent code snippet.", "info");
		} catch {
			ctx.ui.notify("Could not copy the code snippet to the system clipboard.", "error");
		}
	};

	const builtIn = createBashToolDefinition(process.cwd());
	pi.registerTool({
		...builtIn,
		renderCall(args, theme, context) {
			const state = context.state;
			if (context.executionStarted && state.startedAt === undefined) {
				state.startedAt = Date.now();
				state.endedAt = undefined;
			}

			const command = typeof args?.command === "string" ? args.command : undefined;
			let lines: string[];
			if (command === undefined) {
				lines = [theme.fg("error", "[invalid command]")];
			} else if (command.length === 0) {
				lines = [theme.fg("toolOutput", "...")];
			} else {
				lines = splitShellLanguages(command).flatMap((segment) =>
					highlightCode(segment.code, segment.language),
				);
			}

			lines[0] =
				theme.fg("toolTitle", theme.bold("$ ")) +
				(lines[0] ?? "") +
				theme.fg("dim", "  [Ctrl+Alt+C copy]");
			if (args?.timeout && lines.length > 0) {
				lines[lines.length - 1] += theme.fg("muted", ` (timeout ${args.timeout}s)`);
			}

			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			text.setText(lines.join("\n"));
			return text;
		},
	});

	pi.registerCommand("copy-code", {
		description: "Copy the most recent Bash command or fenced code block",
		handler: async (_args, ctx) => copyLatest(ctx),
	});
	pi.registerShortcut("ctrl+alt+c", {
		description: "Copy the most recent rendered code snippet",
		handler: (ctx) => void copyLatest(ctx),
	});
}
