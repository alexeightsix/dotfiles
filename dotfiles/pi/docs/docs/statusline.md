---
title: Statusline
---

# Statusline

`extensions/statusline.ts` replaces Pi's built-in footer with a single line, ordered **most important to least, left to right**:

```
 ⠹ ask+~/dev  hold 3s  gpt-5.6-sol:high  ↑412k ↓18k  cache 71%  $1.87  ctx 34%/1.0M 660k left        ⎇ main  ~/dev/spotlight  mcp 2/5 figma  1m12s
```

Leftmost is what you glance at mid-task: is it working, is it allowed to change things, what is it costing. Rightmost is context you already know — which directory, which branch — and the clock, which matters least because it only tells you something after the fact.

## Left, in order

| Segment | Meaning |
| --- | --- |
| `⠹` | Working indicator, only while a turn runs. Pi's own in-chat loader is suppressed so there is exactly one. |
| `ask` | Permission mode — `all`, `ask`, `ro`. Colour carries the meaning (red nothing stops it, gold you will be asked, green it cannot change anything), so the word "perm" is dropped and a column saved. `+~/dev` shows how far [grants](./modes.md) reach. |
| `hold 3s` | Anything demanding a decision — a [held send](./send-hold.md), a [spend cap](./guardrails.md), [todo](./todo.md) progress, [claude subagents](./claude-subagents.md) — outranks passive information. |
| `gpt-5.6-sol:high` | Active model and thinking level, coloured per model so it is recognisable without reading. |
| `↑412k ↓18k` | Tokens spent — input including cache reads and writes, and output. |
| `cache 71%` | Share of input served from cache. Green over 50%. A number that collapses after a model switch is expected: caches are per-provider. |
| `$1.87` | Session cost, two decimals — the third never changed a decision and cost a column. |
| `ctx 34%/1.0M 660k left` | Context used against the window, and what is left. Green over 50% remaining, amber under, red under 20%. |

## Right, least important outermost

| Segment | Meaning |
| --- | --- |
| `⎇ main` | Git branch |
| `~/dev/spotlight` | Working directory |
| `mcp 2/5 figma` | MCP servers loaded out of configured, and which — see [/dash](./dashboard.md) |
| `1m12s` | Live turn duration while working, total session duration when idle |

## Narrow terminals

The right side goes first, and goes entirely. Everything that matters is on the left, so a narrow terminal loses the branch, the path, the MCP count and the clock before it loses a single spend figure.

## Hiding it

```
/zen
```

Toggles the whole line away and back. Nothing stops being tracked while it is hidden — `/stats` and `/dash` still have everything.

## Changing it

Everything is computed in one `render(width)` function. Token totals come from `ctx.sessionManager.getBranch()`, context from `ctx.getContextUsage()`, branch and extension statuses from the `FooterDataProvider` the factory receives. `ctx.ui.setFooter(undefined)` restores Pi's built-in footer.
