---
title: Modes
---

# Modes

Two independent axes: what the agent is allowed to *do* (permission mode) and whether it is *planning or executing* (plan mode). Both appear in the [statusline](./statusline.md).

## Permission modes

Provided by `extensions/permission-modes.ts`.

| Mode | Behaviour |
| --- | --- |
| `all` | Every tool runs unattended. |
| `ask` | Writes and mutating shell commands prompt first. **Default.** |
| `read-only` | Writes and mutating shell commands are refused outright. |

Read-only work never prompts in any mode. The gate classifies a `bash` call by splitting it on shell separators and requiring *every* segment to be recognisably read-only — a known read-only binary (`ls`, `rg`, `jq`, …) or a reporting subcommand (`git status`, `gh pr view`, `kubectl get`, …). A redirection to anything other than `/dev/null`, a `sudo`, or an unrecognised binary makes the whole command mutating.

```
/perm              pick a mode
/perm all          set one directly
Ctrl+Alt+A         cycle
pi --perm all      start a run in a given mode
```

At the prompt, **Allow all this session** switches the mode to `all` for the rest of the session.

The mode is per-session by design. A permissive mode is never inherited from a run you have forgotten about, and it is never written back to `settings.json`.

## Plan mode

Provided by `extensions/plan-mode/`, Pi's own reference implementation, vendored here so it survives a `pi update`.

Plan mode disables the built-in edit and write tools and restricts `bash` to a read-only allowlist, so the agent can explore without changing anything. It extracts numbered steps from a `Plan:` section, then tracks completion through `[DONE:n]` markers during execution.

```
/plan              toggle
/todos             show plan progress
Ctrl+Alt+P         toggle
pi --plan          start in plan mode
```

Plan state persists across session resume.

### Plan mode and permission modes together

They stack, and the stricter one wins. Plan mode removes the write tools entirely; permission modes gate what remains. Running `read-only` inside plan mode is redundant but harmless.
