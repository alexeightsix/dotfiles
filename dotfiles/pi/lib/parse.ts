/**
 * Pure parsing and formatting shared by the extensions.
 *
 * Dependency-free so it can be unit-tested without a pi process.
 * See tests/unit.test.ts.
 */

/** Accepts `45m`, `2h`, `90` (minutes), or a wall-clock `17:30`. */
export function parseWhen(input: string, now: number = Date.now()): number | undefined {
	const text = input.trim().toLowerCase();

	const clock = text.match(/^(\d{1,2}):(\d{2})$/);
	if (clock) {
		const hours = Number(clock[1]);
		const minutes = Number(clock[2]);
		if (hours > 23 || minutes > 59) return undefined;
		const target = new Date(now);
		target.setHours(hours, minutes, 0, 0);
		// A time already past today means tomorrow, or `/kill 09:00` typed at
		// 10:00 would fire immediately.
		if (target.getTime() <= now) target.setDate(target.getDate() + 1);
		return target.getTime();
	}

	const duration = text.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|h|hr|hrs)?$/);
	if (duration) {
		const value = Number(duration[1]);
		const unit = duration[2] ?? "m";
		return now + (unit.startsWith("h") ? value * 3_600_000 : value * 60_000);
	}

	return undefined;
}

export interface ParsedLimit {
	dollars: number | null;
	tokens: number | null;
}

/** Accepts `$5`, `5`, `500k`, `2M`. Dollars when prefixed, tokens otherwise. */
export function parseLimit(input: string): ParsedLimit | undefined {
	const text = input.trim().toLowerCase();

	const money = text.match(/^\$\s*(\d+(?:\.\d+)?)$/);
	if (money) return { dollars: Number(money[1]), tokens: null };

	const tokens = text.match(/^(\d+(?:\.\d+)?)\s*(k|m)?$/);
	if (tokens) {
		const value = Number(tokens[1]);
		const scale = tokens[2] === "m" ? 1_000_000 : tokens[2] === "k" ? 1000 : 1;
		return { dollars: null, tokens: value * scale };
	}

	return undefined;
}

export function slugify(text: string, fallback = "item"): string {
	return (
		text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 48) || fallback
	);
}

export function fmtTokens(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return `${n}`;
}

export function displayPath(target: string, home = process.env.HOME): string {
	if (home && target === home) return "~";
	if (home && target.startsWith(`${home}/`)) return `~/${target.slice(home.length + 1)}`;
	return target;
}

export interface ForwardConfig {
	prefix: string;
	suffix: string;
}

export interface ForwardEnvelope {
	from: string;
	fromCwd: string;
	at: string;
	text: string;
}

/**
 * Wrap a forwarded message. Blank by default: a wrapper is a claim about
 * context the receiving model will act on, so it is opt-in.
 */
export function applyWrapper(config: ForwardConfig, envelope: ForwardEnvelope): string {
	const fill = (template: string) =>
		template
			.replace(/\{from\}/g, envelope.from)
			.replace(/\{cwd\}/g, displayPath(envelope.fromCwd))
			.replace(/\{at\}/g, envelope.at);
	return `${fill(config.prefix)}${envelope.text}${fill(config.suffix)}`;
}

/**
 * Strip the parts of pi's system prompt that are wrong for a subagent: the
 * parent's tool list (which the subagent cannot call) and pointers into pi's
 * own docs. Sections are removed only when their headers match, so an upstream
 * prompt change degrades to passing the text through rather than mangling it.
 */
export function stripPiOnlySections(piSystemPrompt: string): string {
	let text = piSystemPrompt;
	text = text.replace(/\nAvailable tools:\n[\s\S]*?(?=\nGuidelines:\n)/, "\n");
	text = text.replace(/\nPi documentation \(read only[\s\S]*?(?=\n\n[A-Z#]|\n*$)/, "\n");
	return text.trim();
}

export function slotId(instance: string, index: number): string {
	return `${instance}#${index}`;
}
