---
title: Sessions
---

# Sessions

## Jumping between sessions

Sessions are switched **in place** — same Pi process, same window, no restart. `Ctrl+Alt+S` opens the session picker (the same list as `/resume`), you pick one, and the conversation is replaced under you.

It filters as you type, telescope-style, and inside the picker:

| Key | Action |
| --- | --- |
| `Ctrl+P` | Toggle full paths |
| `Ctrl+S` | Toggle sort order |
| `Ctrl+N` | Show only named sessions |
| `Ctrl+R` | Rename |
| `Ctrl+D` | Delete |

Name a session with `/name <name>` so it is findable later. `Ctrl+Alt+N` starts a new one.

## Forking

`Ctrl+Alt+F`, or `/fork`, creates a new session branching from a previous user message. Because interrupt has been moved off `Escape` (see [Keybindings](./keybindings.md)), a plain **double-Escape forks** — `doubleEscapeAction` is set to `fork` rather than the default `tree`.

`/tree` (`Ctrl+Alt+T`) navigates within the current session's branches instead of creating a new one. `/clone` duplicates the active branch.

## Interrupting

Interrupt is `Ctrl+Escape`, never a bare `Escape`. This is deliberate: a stray `Escape` should not kill a long turn.

## Where sessions live

`~/.pi/agent/sessions/<project-slug>/<timestamp>_<uuid>.jsonl`, one JSONL file per session. Every user message, assistant message, tool call, and tool result is appended as it happens — the full input and output log already exists without any extra logging setup.

Read one directly, or export it:

```bash
pi --session <path> --export session.html
```

[`/improve`](./improve.md) uses a separate session directory so its conversations can be listed and viewed in isolation from your normal work.

## Compaction

Automatic. Configured in `settings.json`:

```json
"compaction": {
  "enabled": true,
  "reserveTokens": 32768,
  "keepRecentTokens": 30000
}
```

It triggers on context overflow, or proactively as the window fills. `/compact [prompt]` forces it with optional instructions, and the [statusline](./statusline.md) colours the remaining context so you can see it coming rather than be surprised by it.

Compactions are counted in [`/stats`](./stats.md). A session that has compacted several times is one where the model has lost detail it once had — worth knowing when its answers start drifting, and a signal to fork rather than keep going.

## Managing sessions

Everything here is built into Pi and needs no extra machinery:

| Want | Use |
| --- | --- |
| Keep going but shrink the context | `/compact`, or let it fire automatically |
| Keep the context but branch the work | `/fork`, or double-Escape |
| Go back to an earlier point in this session | `/tree` (`Ctrl+Alt+T`) |
| Duplicate the current branch | `/clone` |
| Switch to a different conversation | `Ctrl+Alt+S` |
| Find it again later | `/name <name>` |
| Reclaim disk | [`/gc`](./housekeeping.md) |
