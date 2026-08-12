---
title: Vim prompt
---

# Vim prompt

The tracked home configuration wraps the installed `pi-vim` editor in every Pi
working directory. Projects do not carry their own copy.

Pi starts in Insert mode. `Escape` enters Normal mode, and `i` returns to Insert
mode. The compact mode label sits above the prompt's top border and uses the
Rose Pine state colors: foam for INSERT, iris for NORMAL, rose for VISUAL and
V-LINE, and gold for EX. The colored block ends with the label; it does not
extend across the editor.

Prompt submission is deliberately Vim-shaped:

1. Press `Escape` to enter Normal mode.
2. Press `:` to enter the real pi-vim EX line.
3. Enter `w` or `W`.
4. Press `Enter` to submit the complete prompt.

No other editor key submits a prompt. Plain `Enter` and `Ctrl+Enter` are blocked
as submission paths; a Normal-mode `w` remains a motion, and Insert-mode `:w`
or `:W` remains literal text. EX `:q` followed by `Enter` shuts Pi down
gracefully, while Insert-mode `:q` remains literal text.

Provided by `extensions/vim-prompt.ts`, layered over the globally installed
`npm:pi-vim` package.
