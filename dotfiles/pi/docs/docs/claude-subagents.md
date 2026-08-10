---
title: Claude subagents
---

# Claude subagents

`extensions/external-claude-agent.ts` lets Pi delegate to Claude Code. Each subagent is a real `claude` process speaking stream-JSON over stdin/stdout, so it has its own context window and its own conversation, and it keeps that conversation across calls.

Two binaries, two accounts, two different capacities:

| Binary | Account | Concurrent subagents |
| --- | --- | --- |
| `claude` | 5x Max | **4** |
| `claude2` | 1x | **2** |

The caps are enforced in the extension, not left to the model's judgement — exceeding them is what gets an account rate-limited. Asking for a subagent when an instance is full returns an error naming the busy slots and suggesting the other binary.

## Slots

A running subagent is addressed as `claude#1` … `claude#4`, `claude2#1`, `claude2#2`. Each slot is an independent conversation.

- Omit `slot` and the extension reuses an idle subagent in the current directory, or starts a new one if there is room.
- Pass `slot` to address one conversation deliberately — useful for keeping two lines of investigation apart.

A slot is bound to the directory it started in. Tear it down before using that slot elsewhere.

## What context they inherit

Subagents receive the parent's system prompt, minus the parts that are wrong for them.

**They get:** the project's rules and guidelines, `AGENTS.md` / `CLAUDE.md` context files, and the docs-first working order from `APPEND_SYSTEM.md`. Pi's governing context is re-sent whenever it changes mid-conversation.

**They do not get:** Pi's tool list, or pointers into pi's own documentation. Both are actively misleading — a subagent cannot call `todo_write` or `forward_to_session`, and handing it a list of them invites confident calls to tools that do not exist in its process. The prompt says so explicitly: anything named in that context belongs to the parent agent and is unavailable.

**Slash commands are invisible to every model, not just subagents.** `/todo`, `/drive` and the rest are TUI affordances; they appear in no system prompt. If a subagent should know about a workflow, describe the workflow, not the keystroke.

Worth remembering: a subagent is a real `claude` process, so it also loads Claude Code's own `CLAUDE.md` and skills for that directory. That is a second source of instructions this config does not control.

## What they are allowed to do

Read-only, always. Subagents are spawned with `--safe-mode`, `--permission-mode dontAsk`, and an allowlist of `Read`, `Grep`, `Glob`, and reporting-only `Bash` commands. They receive Pi's governing system prompt so they follow the same repository rules, and they get a context update whenever that prompt changes.

They are for a second opinion — investigation, review, confirmation. They never edit files.

## Usage in the UI

The [statusline](./statusline.md) carries a live segment:

```
claude 2/4·1 run  claude2 1/2  ↑412k ↓18k $1.87
```

Slots in use against capacity, how many are mid-turn, and the tokens and dollars the external agents have spent — accumulated from each `result` event's `usage` and `total_cost_usd`.

Per-slot detail:

```
/claude          slots, model, turns, tokens, cost, wall time
/claude stop     tear all of them down
```

The tool's own `action=status` returns the same information to the model, and each tool result is headed with the slot, model, turn count, and that slot's spend.

## Teardown

Subagents are torn down on session shutdown, on abort, and on `/claude stop`. Tearing one down discards its context and deletes its temporary output files, including any full output kept after truncation.
