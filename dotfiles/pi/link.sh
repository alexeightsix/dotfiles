#!/usr/bin/env bash
# Link the tracked Pi configuration into the default (global) Pi agent directory.
# Idempotent: anything already pointing at this repository is left alone, anything
# else is preserved as a timestamped .backup-* before the symlink is created.
set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
agent_dir="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
timestamp=$(date +%Y%m%d-%H%M%S)

link() {
	local relative=$1
	local source="$repo_root/$relative"
	local target="$agent_dir/$relative"
	local expected current backup

	if [ ! -e "$source" ]; then
		echo "link.sh: missing $source" >&2
		return 1
	fi

	expected=$(realpath "$source")
	mkdir -p "$(dirname "$target")"

	if [ -L "$target" ]; then
		current=$(realpath "$target" 2>/dev/null || true)
		if [ "$current" = "$expected" ]; then
			echo "  ok       $relative"
			return 0
		fi
		backup="${target}.backup-${timestamp}"
		mv -- "$target" "$backup"
		echo "  backup   $relative -> $(basename "$backup")"
	elif [ -e "$target" ]; then
		backup="${target}.backup-${timestamp}"
		mv -- "$target" "$backup"
		echo "  backup   $relative -> $(basename "$backup")"
	fi

	ln -s "$source" "$target"
	echo "  linked   $relative"
}

echo "pi: linking into $agent_dir"

link settings.json
link keybindings.json
link mcp.json
link APPEND_SYSTEM.md
link lib
link themes/rose-pine.json
link extensions/statusline.ts
link extensions/syntax-highlighting.ts
link extensions/permission-modes.ts
link extensions/improve.ts
link extensions/claude-provider.ts
link extensions/drive.ts
link extensions/dashboard.ts
link extensions/docs.ts
link extensions/demo.ts
link extensions/notify.ts
link extensions/questions.ts
link extensions/session-stats.ts
link extensions/notes.ts
link extensions/shell-log.ts
link extensions/send-hold.ts
link extensions/forwarding.ts
link extensions/todo.ts
link extensions/drafts.ts
link extensions/guardrails.ts
link extensions/housekeeping.ts
link extensions/git-interceptor.ts
link extensions/external-claude-agent.ts
link extensions/plan-mode
link skills/pr-review
link skills/demo
link skills/source-of-truth

echo "pi: done. Run 'pi' to pick up the config, or /reload inside a session."
