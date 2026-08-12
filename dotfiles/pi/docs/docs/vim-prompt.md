---
title: Vim prompt
---

# Vim prompt

The tracked home configuration wraps the installed `pi-vim` editor in every Pi
working directory. Projects do not carry their own copy.

Pi starts in Insert mode. `Escape` enters Normal mode, and `i` returns to Insert
mode. The compact mode label is the far-left segment of the global statusline,
before its spinner and every other status; the editor has no separate mode row.
It uses the Rose Pine state colors: foam for INSERT, iris for NORMAL, rose for
VISUAL and V-LINE, and gold for EX.

Prompt submission is deliberately Vim-shaped:

1. Press `Escape` to enter Normal mode.
2. Press `:` to enter the real pi-vim EX line.
3. Enter `w` or `W`.
4. Press `Enter` to submit the complete prompt.

No other editor key submits a prompt. Plain `Enter` and `Ctrl+Enter` are blocked
as submission paths; a Normal-mode `w` remains a motion, and Insert-mode `:w`
or `:W` remains literal text. EX `:q` followed by `Enter` shuts Pi down
gracefully, while Insert-mode `:q` remains literal text.

The wrapper preserves every clipboard path supplied by Pi and pi-vim:
terminal bracketed paste, `Ctrl+V` system-clipboard text/image paste, Vim yanks
mirrored to the system clipboard, and Normal-mode `p`/`P` puts.

Provided by `extensions/vim-prompt.ts`, layered over the globally installed
`npm:pi-vim` package.
