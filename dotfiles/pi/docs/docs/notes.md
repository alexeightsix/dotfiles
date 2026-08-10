---
title: /notes
---

# `/notes`

A mode where what you type is written down instead of answered.

```
/notes         toggle
/notes show    print this directory's notes
/notes path    where the file is
/notes open    open it in $EDITOR
```

While notes mode is on, every prompt is intercepted and appended to a notes file. Nothing reaches a model, nothing enters the session, nothing is billed, and the context window is untouched. It is for thinking out loud mid-task without derailing the conversation.

A `notes` badge appears in the [statusline](./statusline.md) while the mode is on, because a mode that silently swallows input needs to be visible.

## Files

One file per working directory, under `~/.pi/agent/notes/`, named after the directory. Entries are appended with an ISO timestamp heading, so the file stays readable as plain Markdown.

## Escape hatches

Slash commands still work while the mode is on — otherwise you could not turn it off. Anything starting with `/` passes straight through.

Switching sessions turns notes mode off. Silently swallowing the first prompt of a new conversation would be a nasty surprise.

## Not garbage collected

Notes are excluded from [`/gc`](./housekeeping.md) pruning. They are written by hand and cannot be regenerated, unlike transcripts and logs.
