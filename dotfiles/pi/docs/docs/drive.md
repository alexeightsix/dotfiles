---
title: /drive
---

# `/drive`

Routing mode. With drive on, no prompt goes straight to whatever model happens to be selected — drive works out what kind of request it is first, then picks the model and the effort level to match.

```
/drive        toggle
/drive log    the routing history for this session
```

## How it decides

Drive asks, rather than guessing:

> What is the nature of your request?

When the answer settles the scale, it routes. When it does not — "a focused change" could be one file or twelve — it asks one follow-up, then routes. Never more than two questions.

| Answer | Routes to | Effort |
| --- | --- | --- |
| Question or lookup | `deepseek-v4-flash` → `gpt-5.5` | low |
| Focused change, one or two files | `gpt-5.6-sol` | medium |
| Focused change, several files | `gpt-5.6-sol` → `claude` | high |
| Build or refactor | `claude` → `gpt-5.6-terra` | high |
| Debug or design | `gpt-5.6-terra` → `claude` | xhigh |
| Large-context sweep | `kimi-k3` → `deepseek-v4-flash` | medium |

Each row is a preference order, not a single choice. Drive takes the first model that is in your `enabledModels`, is actually available, and has not run out of quota this session. Cheap work goes to cheap models on low effort; work whose whole difficulty is reasoning goes to the top tier at maximum effort.

## Routing is always visible

Two places, every time:

- A notification when the route is applied: the model, the thinking level, and one line on why.
- A `drive → claude:high` segment in the [statusline](./statusline.md) that persists for the turn.

`/drive log` prints the whole session's routing decisions with timestamps. Nothing is routed silently.

## Quota as an input

Drive skips providers it has seen refuse work. When a provider returns an insufficient-credits or rate-limit error, that provider is marked exhausted for the rest of the session and drive routes around it.

This remains reactive because drive itself does not run the cross-agent [usage collector](./agent-usage.md) before routing. The providers no longer have one uniform limitation:

- Codex exposes current windows through its app-server JSON-RPC interface.
- Claude Code exposes them only through `/usage` in an interactive session; the collector opens a temporary tmux session and reads the structured cache that panel refreshes. `--print --output-format stream-json` still has no remaining-quota field.
- OpenCode records exact observed cost locally, but the OpenCode Go provider API key does not expose the account's live remaining allowance.

So drive cannot yet pre-emptively avoid an account that is nearly out. It learns the first time it is told no, and does not ask that provider again. The earlier blanket claim that no provider exposed remaining usage was a defect: it became false when Codex shipped `account/rateLimits/read`.

## Turning it off

`/drive` again. The model stays wherever the last route left it — turning drive off does not restore what you were on before.
