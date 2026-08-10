---
title: Claude as a model
---

# Claude as a model

`claude` and `claude2` are selectable models, not just a tool. Pick one with `Ctrl+P` or `Ctrl+L` and **Claude Code becomes the primary orchestrator for that turn** — it plans, it runs its own tools, it does the work, and Pi renders the result.

```
claude-code/claude     the 5x Max account
claude-code/claude2    the 1x account
```

They sit in the `enabledModels` cycle alongside the gpt-5.6 models and kimi-k3, so switching is one keystroke.

## This is not the `claude` tool

Two different things share the name. Both exist, and they do not interfere:

| | Claude as a **model** | The `claude` **tool** |
| --- | --- | --- |
| How you reach it | `Ctrl+P` / `Ctrl+L`, select it | The active model calls it |
| Who is in charge | Claude Code orchestrates the turn | Pi orchestrates; Claude advises |
| Tools it may use | Its own full set | Read-only, allowlisted |
| Concurrency | One process per turn | Pooled: 4 for `claude`, 2 for `claude2` |
| Available when | You select it | Always, under any model |

Selecting `claude` as your model does not disable the tool. You can be running Claude-as-orchestrator and still have it spawn read-only subagents — see [Claude subagents](./claude-subagents.md).

Both draw on the same accounts, so an orchestrator turn is one more concurrent process on that account, on top of whatever the subagent pool is holding.

## What Pi sends

Each turn is a fresh `claude --print` process. It is stateless by design: Pi owns the conversation, and serializes the entire history — system prompt, user turns, assistant turns, and any tool exchanges from earlier models — into the prompt every time.

That has two consequences worth knowing:

- **Context carries across a model switch.** Talk to gpt-5.6, switch to `claude`, and it picks up the thread. This is the same behaviour as any other provider switch — see [Models](./models.md#context-is-shared-across-providers).
- **There is no prompt cache.** A new process cannot reuse the previous one's cache, so every turn pays full input cost. Watch the `$` figure in the [statusline](./statusline.md) when the conversation gets long.

## Permissions

Claude Code runs its own tool loop, so Pi's `/perm` gate cannot sit between it and the filesystem. The posture is chosen when the process is spawned:

| Pi's permission mode | How Claude is spawned |
| --- | --- |
| `all` or `ask` | Full tools, `--permission-mode acceptEdits` — it can edit, write, and run commands |
| `read-only` | Read-only allowlist and `--safe-mode`, matching the subagent bridge |

So `ask` does **not** mean Claude will ask — it means Claude gets to work. If you want the orchestrator held back, put Pi in `read-only` before switching to it. This is stated here because it is the one place where a permission mode does something other than what its name suggests.

## Usage and cost

Tokens and dollars come from Claude's own `result` event — real reported usage, not an estimate from a price table. They land in the normal Pi accounting, so the statusline's `↑ ↓ $` figures include Claude turns and `/session` totals them correctly.

## Requirements

The `claude` and `claude2` binaries must be on `PATH` and already logged in. The provider does not manage credentials; if a binary is missing, its model is not registered and simply does not appear in the picker.
