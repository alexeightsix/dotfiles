#!/usr/bin/env bash
# Focus tab N in the focused workspace, creating it if it doesn't exist.
# Bound to F1..F8 in ~/.config/herdr/config.toml, mirroring
#   bind -n F1 if-shell 'tmux select-window -t :1' '' 'new-window -t :1 ...'
# from tmux.conf.
#
# herdr's `tab focus` takes a workspace-scoped id ("wK:t1"), not an index,
# so the current workspace has to be resolved first.
set -euo pipefail

n=${1:?usage: herdr-tab.sh <tab-number>}
herdr=${HERDR_BIN:-$HOME/.local/bin/herdr}

ws=$("$herdr" workspace list \
  | jq -r 'first(.result.workspaces[] | select(.focused) | .workspace_id) // empty')
[ -n "$ws" ] || exit 0

tab=$("$herdr" tab list \
  | jq -r --arg ws "$ws" --argjson n "$n" \
      'first(.result.tabs[] | select(.workspace_id == $ws and .number == $n) | .tab_id) // empty')

if [ -n "$tab" ]; then
  "$herdr" tab focus "$tab" >/dev/null
else
  # tmux creates the window at index N; herdr appends, so this lands on the
  # next free number rather than exactly N.
  "$herdr" tab create --workspace "$ws" --focus >/dev/null
fi
