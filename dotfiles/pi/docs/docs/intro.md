---
sidebar_position: 1
slug: /
title: This is the source of truth
---

# Pi, as configured here

This site documents the [Pi](https://github.com/badlogic/pi-mono) instance defined in `~/kickstart/dotfiles/pi`. Pi is the editor; this directory is its configuration; this site describes what that configuration does.

**The documentation is the source of truth, not the code.** When a page here and the config disagree, the config is the thing that is wrong.

## The working order

1. A request comes in.
2. Check the documentation.
3. If the request changes behaviour, update the documentation first.
4. Then change the code to match.

Every documentation edit is logged in the [changelog](./changelog.md) with the reason for it. What changed is recoverable from git; why it changed is not.

This order is not a style preference — it is enforced in two places, so an agent working in this repository follows it whether or not anyone reminds it to:

- `APPEND_SYSTEM.md` is appended to Pi's system prompt for every session, globally.
- The [`/improve`](./improve.md) brief repeats it, so a self-review starts from the docs rather than from the code.

## What is where

| Path | What it is |
| --- | --- |
| `settings.json` | Model defaults, theme, compaction, retry, packages |
| `keybindings.json` | Key overrides — see [Keybindings](./keybindings.md) |
| `mcp.json` | MCP servers — see [MCP](./mcp.md) |
| `APPEND_SYSTEM.md` | The working order above, appended to every session's system prompt |
| `themes/rose-pine.json` | The theme |
| `extensions/` | Local extensions: statusline, permission modes, plan mode, improve, the Claude bridge, the git interceptor |
| `skills/` | Configuration-owned `demo`, `pr-review`, and `source-of-truth`; third-party Matt Pocock skills live under `~/.agents/skills/` |
| `link.sh` | Symlinks all of the above into `~/.pi/agent` |
| `docs/` | This site |

Everything in `~/.pi/agent` that matters is a symlink back into this directory. Runtime state — sessions, credentials, the model catalogue, installed npm packages — stays in `~/.pi/agent` and is deliberately **not** tracked.

## What is not tracked, and why

`~/.pi/agent/auth.json` holds OAuth tokens and API keys. It is never copied into this repository. Provider credentials are established once per machine with `/login` inside Pi, or by the provider's own CLI. See [Models and providers](./models.md#credentials).
