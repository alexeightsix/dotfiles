import { type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { EditorComponent } from "@earendil-works/pi-tui";
import { matchesKey, stripTerminalSequences } from "@earendil-works/pi-tui";

type VimMode = "insert" | "normal" | "visual" | "visual-line";
type ModeColor = "insert" | "normal" | "visual" | "ex";

type AppActionHandler = () => void;

type VimEditor = EditorComponent & {
	actionHandlers: Map<string, AppActionHandler>;
	getMode?: () => VimMode;
	onCtrlD?: AppActionHandler;
	onEscape?: AppActionHandler;
	onExtensionShortcut?: (data: string) => boolean;
	onPasteImage?: AppActionHandler;
	onSubmit?: (text: string) => void;
};

export class VimPromptEditor implements EditorComponent {
	onSubmit?: (text: string) => void;
	onChange?: (text: string) => void;
	private mode: VimMode = "insert";
	private inExMode = false;
	private exCommand = "";
	private allowBaseSubmit = false;

	constructor(
		private readonly base: VimEditor,
		private readonly quit: () => void,
		private readonly setModeStatus: (mode: ModeColor, text: string) => void,
	) {
		this.publishModeStatus();
	}

	get actionHandlers(): Map<string, AppActionHandler> {
		return this.base.actionHandlers;
	}

	get onCtrlD(): AppActionHandler | undefined { return this.base.onCtrlD; }
	set onCtrlD(handler: AppActionHandler | undefined) { this.base.onCtrlD = handler; }
	get onEscape(): AppActionHandler | undefined { return this.base.onEscape; }
	set onEscape(handler: AppActionHandler | undefined) { this.base.onEscape = handler; }
	get onPasteImage(): AppActionHandler | undefined { return this.base.onPasteImage; }
	set onPasteImage(handler: AppActionHandler | undefined) { this.base.onPasteImage = handler; }
	get onExtensionShortcut(): ((data: string) => boolean) | undefined {
		return this.base.onExtensionShortcut;
	}
	set onExtensionShortcut(handler: ((data: string) => boolean) | undefined) {
		this.base.onExtensionShortcut = handler;
	}

	getMode(): VimMode {
		return this.mode;
	}

	getPendingCommand(): string {
		return this.exCommand;
	}

	handleInput(data: string): void {
		this.syncCallbacks();

		if (this.isCtrlReturn(data)) return;
		if (this.inExMode) {
			this.handleExInput(data);
			return;
		}

		// Prompt submission is intentionally exclusive to the EX `:w`/`:W` command.
		// Shift+Return/Ctrl+J remain ordinary newline input; every key that could
		// submit or queue the composed prompt is swallowed here.
		if (this.isPlainReturn(data) || matchesKey(data, "alt+return")) return;

		const previousMode = this.mode;
		this.base.handleInput(data);
		this.refreshMode();

		if (previousMode === "normal" && data === ":") {
			this.inExMode = true;
			this.exCommand = ":";
		}
		this.publishModeStatus();
	}

	private handleExInput(data: string): void {
		if (matchesKey(data, "escape")) {
			this.resetExMode();
			this.base.handleInput(data);
			this.refreshMode();
			this.publishModeStatus();
			return;
		}

		if (matchesKey(data, "backspace") || matchesKey(data, "ctrl+h")) {
			const exitsExMode = this.exCommand === ":";
			this.exCommand = this.exCommand.slice(0, -1);
			this.base.handleInput(data);
			if (exitsExMode) this.resetExMode();
			this.publishModeStatus();
			return;
		}

		if (this.isPlainReturn(data)) {
			const command = this.exCommand.slice(1).trim();
			if (command === "w" || command === "W") {
				this.cancelBaseExMode();
				this.submitPrompt();
				return;
			}
			if (command === "q") {
				this.cancelBaseExMode();
				this.quit();
				return;
			}

			this.resetExMode();
			this.allowBaseSubmit = true;
			try {
				this.base.handleInput(data);
			} finally {
				this.allowBaseSubmit = false;
			}
			this.refreshMode();
			this.publishModeStatus();
			return;
		}

		this.exCommand += data;
		this.base.handleInput(data);
		this.publishModeStatus();
	}

	private submitPrompt(): void {
		const prompt = this.getExpandedText();
		if (!prompt.trim()) {
			this.publishModeStatus();
			return;
		}
		this.setText("");
		this.onSubmit?.(prompt);
		this.refreshMode();
		this.publishModeStatus();
	}

	private cancelBaseExMode(): void {
		this.resetExMode();
		this.base.handleInput("\x1b");
		this.refreshMode();
	}

	private resetExMode(): void {
		this.inExMode = false;
		this.exCommand = "";
	}

	private syncCallbacks(): void {
		this.base.onSubmit = (text: string) => {
			if (this.allowBaseSubmit) this.onSubmit?.(text);
		};
		this.base.onChange = this.onChange;
	}

	private refreshMode(): void {
		this.mode = this.base.getMode?.() ?? this.mode;
	}

	private publishModeStatus(): void {
		if (this.inExMode) {
			this.setModeStatus("ex", `EX ${this.exCommand}_`);
			return;
		}
		if (this.mode === "insert") {
			this.setModeStatus("insert", "INSERT");
			return;
		}
		if (this.mode === "normal") {
			this.setModeStatus("normal", "NORMAL");
			return;
		}
		this.setModeStatus("visual", this.mode === "visual-line" ? "V-LINE" : "VISUAL");
	}

	private isPlainReturn(data: string): boolean {
		return matchesKey(data, "return");
	}

	private isCtrlReturn(data: string): boolean {
		return matchesKey(data, "ctrl+return");
	}

	getText(): string { return this.base.getText(); }
	setText(text: string): void { this.base.setText(text); }
	getExpandedText(): string { return this.base.getExpandedText?.() ?? this.base.getText(); }
	addToHistory(text: string): void { this.base.addToHistory?.(text); }
	insertTextAtCursor(text: string): void { this.base.insertTextAtCursor?.(text); }
	setAutocompleteProvider(provider: Parameters<NonNullable<VimEditor["setAutocompleteProvider"]>>[0]): void {
		this.base.setAutocompleteProvider?.(provider);
	}
	setPaddingX(padding: number): void { this.base.setPaddingX?.(padding); }
	setAutocompleteMaxVisible(maxVisible: number): void { this.base.setAutocompleteMaxVisible?.(maxVisible); }
	invalidate(): void { this.base.invalidate(); }
	render(width: number): string[] {
		const lines = this.base.render(width);
		if (lines.length === 0) return lines;

		const last = lines.length - 1;
		const line = lines[last] ?? "";
		const plain = stripTerminalSequences(line);
		const label = plain.match(
			/ (?:INSERT|EX(?: [^\n]*)?|NORMAL(?: [^\n]*)?|VISUAL(?: [^\n]*)?|V-LINE(?: [^\n]*)?) $/,
		)?.[0];
		if (!label) return lines;

		return lines.slice(0, last);
	}
}

export default function (pi: ExtensionAPI) {
	let installTimer: ReturnType<typeof setTimeout> | undefined;

	pi.on("session_start", (_event, ctx) => {
		// Global extensions load before package extensions. Defer wrapping until
		// pi-vim has installed its editor during this same session_start pass.
		installTimer = setTimeout(() => {
			const previous = ctx.ui.getEditorComponent();
			if (!previous) {
				ctx.ui.notify("vim-prompt requires pi-vim", "error");
				return;
			}
			const uiTheme = ctx.ui.theme;
			ctx.ui.setEditorComponent((tui, theme, keybindings) => {
				const tokens: Record<ModeColor, string> = {
					insert: "success",
					normal: "accent",
					visual: "borderAccent",
					ex: "warning",
				};
				return new VimPromptEditor(
					previous(tui, theme, keybindings) as VimEditor,
					() => ctx.shutdown(),
					(mode, text) =>
						ctx.ui.setStatus(
							"vim-mode",
							uiTheme.fg(tokens[mode], `\x1b[7m ${text} \x1b[27m`),
						),
				);
			});
		}, 0);
	});

	pi.on("session_shutdown", () => {
		if (installTimer) clearTimeout(installTimer);
	});
}
