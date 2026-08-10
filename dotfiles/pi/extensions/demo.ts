/**
 * /demo — have the agent show you a feature working, in a tmux pane.
 *
 *   /demo /draft
 *   /demo the send hold countdown
 *
 * Loads the demo skill and points it at whatever you named. The agent opens a
 * pane, drives the real thing in it, captures the pane to check what actually
 * happened, and leaves it on screen.
 *
 * See docs/demo.md — it is the source of truth for this file.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("demo", {
		description: "Have the agent demo something live in a tmux pane",
		handler: async (args, ctx) => {
			const target = args.trim();
			if (!target) {
				ctx.ui.notify("What should I demo? e.g. /demo /draft", "warning");
				return;
			}

			// Not a hard requirement any more: a web, API or database demo needs no
			// pane. Only terminal demos do, so tell the agent rather than refuse.
			const tmux = process.env.TMUX
				? "tmux is available for terminal demos."
				: "NOT inside tmux — do not attempt a tmux demo; use a medium that does not need a pane.";

			pi.sendUserMessage(
				[
					`Use the demo skill to show me: ${target}`,
					"",
					"Pick the medium that fits what this is, produce evidence I can look at, and",
					"leave it in place. Show me, do not describe it.",
					"",
					tmux,
				].join("\n"),
			);
		},
	});
}
