#!/usr/bin/env bash
# Modal window rename, launched from a tmux popup (prefix + r).
# Pre-fills the current name. Enter commits; Escape, Ctrl-C or an empty line aborts.

export INPUTRC="${BASH_SOURCE[0]%.sh}.inputrc"

cur=$(tmux display-message -p '#W')
read -e -i "$cur" -p '  ' name || exit 0
[ -n "$name" ] && tmux rename-window -- "$name"
exit 0
