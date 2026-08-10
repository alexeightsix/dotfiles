#!/usr/bin/env bash
# End-to-end tests against the real binaries: pi, claude, tmux.
#
#   ./tests/e2e.sh          everything that costs nothing
#   ./tests/e2e.sh --paid   also the tests that spend real tokens
#
# These are deliberately not mocked. The failures worth catching here — an
# extension that throws on load, a symlink that does not resolve, a provider
# that is not authenticated — only happen against the real thing.
set -uo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
paid=0
[ "${1:-}" = "--paid" ] && paid=1

pass=0
fail=0
skip=0

ok()   { printf '  \033[32mok\033[0m    %s\n' "$1"; pass=$((pass + 1)); }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n%s\n' "$1" "${2:-}"; fail=$((fail + 1)); }
miss() { printf '  \033[33mskip\033[0m  %s (%s)\n' "$1" "$2"; skip=$((skip + 1)); }

echo "e2e: $repo_root"

# --- config integrity -------------------------------------------------------

echo
echo "config"

for file in settings.json mcp.json keybindings.json themes/rose-pine.json; do
	if python3 -c "import json,sys;json.load(open('$repo_root/$file'))" 2>/dev/null; then
		ok "$file is valid JSON"
	else
		bad "$file is valid JSON"
	fi
done

# link.sh must be idempotent and must not touch anything outside the target dir.
tmp_agent=$(mktemp -d)
if PI_CODING_AGENT_DIR="$tmp_agent" bash "$repo_root/link.sh" >/dev/null 2>&1; then
	first=$(find "$tmp_agent" -type l | sort)
	PI_CODING_AGENT_DIR="$tmp_agent" bash "$repo_root/link.sh" >/dev/null 2>&1
	second=$(find "$tmp_agent" -type l | sort)
	if [ "$first" = "$second" ] && [ -n "$first" ]; then
		ok "link.sh is idempotent ($(printf '%s\n' "$first" | wc -l) links)"
	else
		bad "link.sh is idempotent" "links changed on second run"
	fi

	# Every link must resolve, and resolve back into this repository.
	dangling=0
	strays=0
	while IFS= read -r link; do
		target=$(readlink -f "$link" 2>/dev/null) || true
		[ -e "$target" ] || dangling=$((dangling + 1))
		case "$target" in "$repo_root"/*) ;; *) strays=$((strays + 1)) ;; esac
	done <<<"$first"
	[ "$dangling" -eq 0 ] && ok "no dangling links" || bad "no dangling links" "$dangling dangling"
	[ "$strays" -eq 0 ] && ok "all links point into the repo" || bad "all links point into the repo" "$strays stray"
else
	bad "link.sh runs against a temp agent dir"
fi
rm -rf "$tmp_agent"

# --- unit tests -------------------------------------------------------------

echo
echo "units"
if out=$(cd "$repo_root" && node --experimental-strip-types --test tests/*.test.ts 2>&1); then
	ok "unit suite ($(printf '%s' "$out" | grep -oP '# pass \K\d+') assertions)"
else
	bad "unit suite" "$out"
fi

# --- pi itself --------------------------------------------------------------

echo
echo "pi"

if ! command -v pi >/dev/null 2>&1; then
	miss "pi loads every extension" "pi not on PATH"
else
	# The single most valuable check: extension load errors go to stderr before
	# any model call, so this catches a broken extension without spending money.
	out=$(cd /tmp && timeout 120 pi --list-models "gpt-5.6-sol" 2>&1)
	if printf '%s' "$out" | grep -qi "Failed to load extension"; then
		bad "pi loads every extension" "$(printf '%s' "$out" | grep -i 'failed to load' | head -3)"
	else
		ok "pi loads every extension"
	fi

	# Loading cannot catch command-time API drift. Invoke /dash through a real
	# RPC process; custom UI is a no-op there, but the command must reach it
	# without emitting an extension error.
	dash=$(cd /tmp && printf '%s\n' '{"id":"dash-check","type":"prompt","message":"/dash"}' |
		timeout 30 pi --mode rpc --no-session 2>&1)
	if printf '%s' "$dash" | grep -q '"id":"dash-check","type":"response","command":"prompt","success":true' &&
		! printf '%s' "$dash" | grep -q '"type":"extension_error"'; then
		ok "/dash command reaches its renderer"
	else
		bad "/dash command reaches its renderer" "$(printf '%s' "$dash" | grep -E 'extension_error|dash-check' | tail -5)"
	fi

	# The claude-code provider must register both binaries as models.
	models=$(cd /tmp && timeout 120 pi --list-models claude 2>&1)
	for want in "claude-code  claude " "claude-code  claude2"; do
		if printf '%s' "$models" | grep -q "$want"; then
			ok "model registered:${want#claude-code  }"
		else
			bad "model registered:${want#claude-code  }"
		fi
	done

	# Every provider the config routes to should be authenticated.
	for provider in openai-codex anthropic; do
		if timeout 60 pi auth check --provider "$provider" 2>&1 | grep -q ready; then
			ok "provider ready: $provider"
		else
			bad "provider ready: $provider"
		fi
	done
fi

# --- claude subagent binaries ----------------------------------------------

echo
echo "claude"
for binary in claude claude2; do
	if command -v "$binary" >/dev/null 2>&1; then
		ok "$binary on PATH"
	else
		bad "$binary on PATH"
	fi
done

# --- paid: real turns -------------------------------------------------------

echo
echo "paid"
if [ "$paid" -eq 0 ]; then
	miss "real turn through the default model" "pass --paid to run"
	miss "real turn through claude-code provider" "pass --paid to run"
else
	out=$(cd /tmp && timeout 300 pi -p --no-session --thinking off -nt "Reply with exactly: ok" 2>&1)
	if printf '%s' "$out" | grep -qx "ok"; then
		ok "real turn through the default model"
	else
		bad "real turn through the default model" "$out"
	fi

	# Exercises the custom provider: subprocess, stream-json parsing, usage map.
	usage=$(cd /tmp && timeout 300 pi -p --mode json --no-session \
		--provider claude-code --model claude "Reply with exactly: ok" 2>&1 |
		python3 -c "
import sys, json
for line in sys.stdin:
    try: e = json.loads(line)
    except Exception: continue
    if e.get('type') == 'turn_end':
        u = e['message']['usage']
        print(u['totalTokens'], u['cost']['total'])
" 2>/dev/null)
	if [ -n "$usage" ] && [ "${usage%% *}" -gt 0 ] 2>/dev/null; then
		ok "real turn through claude-code provider (usage: $usage)"
	else
		bad "real turn through claude-code provider" "no usage reported"
	fi
fi

echo
printf 'e2e: %d passed, %d failed, %d skipped\n' "$pass" "$fail" "$skip"
[ "$fail" -eq 0 ]
