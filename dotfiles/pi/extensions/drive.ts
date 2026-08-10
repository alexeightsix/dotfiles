/**
 * /drive — route each request to the model that fits it.
 *
 * With drive on, every prompt is intercepted before it reaches a model. Drive
 * asks what kind of request it is, asks a follow-up when the answer does not
 * pin down the scale, and only then picks a model and a thinking level.
 *
 * Routing is never silent. The chosen route is announced when it is applied and
 * stays visible in the statusline for the whole turn, so it is always clear
 * where a prompt went.
 *
 * See docs/drive.md — it is the source of truth for this file.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

interface Route {
	/** Model ids in preference order; the first one available is used. */
	prefer: string[];
	thinking: ThinkingLevel;
	why: string;
}

interface Category {
	label: string;
	description: string;
	/** When set, drive asks this before routing, and picks the route by answer. */
	followUp?: { question: string; options: { label: string; description: string; route: Route }[] };
	route?: Route;
}

const CATEGORIES: Category[] = [
	{
		label: "Question or lookup",
		description: "Explain something, find a file, read a value. No changes.",
		route: {
			prefer: ["deepseek-v4-flash", "gpt-5.5", "gpt-5.6-sol"],
			thinking: "low",
			why: "cheap model, low effort — answering costs nothing to get wrong twice",
		},
	},
	{
		label: "Focused change",
		description: "A known edit in a known place.",
		followUp: {
			question: "How much of the codebase does it touch?",
			options: [
				{
					label: "One or two files",
					description: "Contained, the shape is already clear",
					route: {
						prefer: ["gpt-5.6-sol", "gpt-5.5"],
						thinking: "medium",
						why: "mid-tier, medium effort — contained edit",
					},
				},
				{
					label: "Several files",
					description: "Touches callers, tests, types",
					route: {
						prefer: ["gpt-5.6-sol", "claude"],
						thinking: "high",
						why: "mid-tier, high effort — the change has to stay consistent across files",
					},
				},
			],
		},
	},
	{
		label: "Build or refactor",
		description: "New capability, or reshaping something that exists.",
		route: {
			prefer: ["claude", "gpt-5.6-terra", "gpt-5.6-sol"],
			thinking: "high",
			why: "top tier as orchestrator — the work needs planning, not just editing",
		},
	},
	{
		label: "Debug or design",
		description: "Something is wrong and the cause is unknown, or the shape is undecided.",
		route: {
			prefer: ["gpt-5.6-terra", "claude", "gpt-5.6-sol"],
			thinking: "xhigh",
			why: "top tier, maximum effort — reasoning is the whole task",
		},
	},
	{
		label: "Large-context sweep",
		description: "Read or audit a lot of material at once.",
		route: {
			prefer: ["kimi-k3", "deepseek-v4-flash", "claude"],
			thinking: "medium",
			why: "million-token window — the constraint is how much fits, not how hard it thinks",
		},
	},
];

export default function (pi: ExtensionAPI) {
	let driving = false;
	let lastRoute: string | undefined;

	/**
	 * Accounts that have reported they are out of quota or credits this session.
	 * True remaining subscription usage is not exposed by any provider we use, so
	 * drive learns it the only way available: by being told no once.
	 */
	const exhausted = new Set<string>();

	const history: { at: number; category: string; model: string; thinking: string }[] = [];

	const showStatus = (ctx: ExtensionContext) => {
		const theme = ctx.ui.theme;
		if (!driving) {
			ctx.ui.setStatus("drive", undefined);
			return;
		}
		ctx.ui.setStatus(
			"drive",
			theme.fg("accent", "drive") + theme.fg("dim", lastRoute ? ` → ${lastRoute}` : " → waiting"),
		);
	};

	/** Resolve the first preferred model that is scoped, available, and not exhausted. */
	const resolve = (ctx: ExtensionContext, prefer: string[]) => {
		for (const wanted of prefer) {
			const scoped = ctx.scopedModels.find(
				(candidate) =>
					candidate.model.id === wanted && !exhausted.has(candidate.model.provider),
			);
			if (scoped) return scoped.model;
		}
		return undefined;
	};

	const applyRoute = async (route: Route, category: string, ctx: ExtensionContext) => {
		const model = resolve(ctx, route.prefer);
		if (!model) {
			ctx.ui.notify(
				`drive: none of ${route.prefer.join(", ")} is available — staying on ${ctx.model?.id ?? "the current model"}.`,
				"warning",
			);
			return;
		}

		await ctx.setModel(model);
		ctx.setThinkingLevel(route.thinking);

		lastRoute = `${model.id}:${route.thinking}`;
		history.push({ at: Date.now(), category, model: model.id, thinking: route.thinking });
		showStatus(ctx);

		// Announced, not silent: the point of drive is that routing is legible.
		ctx.ui.notify(`drive → ${model.id} · thinking ${route.thinking}\n${route.why}`, "info");
	};

	pi.on("session_start", async (_event, ctx) => {
		showStatus(ctx);
	});

	// Learn which accounts have stopped accepting work.
	pi.on("after_provider_response", async (event) => {
		const detail = JSON.stringify((event as { error?: unknown }).error ?? "");
		if (/insufficient balance|credits|rate.?limit|quota/i.test(detail)) {
			const provider = (event as { model?: { provider?: string } }).model?.provider;
			if (provider) exhausted.add(provider);
		}
	});

	pi.on("input", async (event, ctx) => {
		// sendUserMessage re-enters the input chain with source=extension. The
		// prompt was already classified when typed; never open the dialogs twice.
		if (event.source === "extension" || !driving || !ctx.hasUI) {
			return { action: "continue" as const };
		}
		if (!event.text.trim() || event.text.trim().startsWith("/")) {
			return { action: "continue" as const };
		}

		const choice = await ctx.ui.select(
			"What is the nature of your request?",
			CATEGORIES.map((category) => `${category.label} — ${category.description}`),
		);
		if (!choice) return { action: "continue" as const };

		const category = CATEGORIES.find((candidate) => choice.startsWith(candidate.label));
		if (!category) return { action: "continue" as const };

		// Ask again when the category alone does not settle the effort level.
		if (category.followUp) {
			const scope = await ctx.ui.select(
				category.followUp.question,
				category.followUp.options.map((option) => `${option.label} — ${option.description}`),
			);
			const picked = category.followUp.options.find((option) => scope?.startsWith(option.label));
			if (picked) await applyRoute(picked.route, category.label, ctx);
		} else if (category.route) {
			await applyRoute(category.route, category.label, ctx);
		}

		return { action: "continue" as const };
	});

	pi.registerCommand("drive", {
		description: "Route each request to a fitting model (add 'log' for routing history)",
		handler: async (args, ctx) => {
			if (args.trim() === "log") {
				ctx.ui.notify(
					history.length === 0
						? "No requests routed yet."
						: history
								.map(
									(entry) =>
										`${new Date(entry.at).toLocaleTimeString()}  ${entry.category} → ${entry.model}:${entry.thinking}`,
								)
								.join("\n"),
					"info",
				);
				return;
			}

			driving = !driving;
			if (!driving) lastRoute = undefined;
			showStatus(ctx);
			ctx.ui.notify(
				driving
					? "drive on — every prompt is classified before it is routed."
					: "drive off — the model stays where you put it.",
				"info",
			);
		},
	});
}
