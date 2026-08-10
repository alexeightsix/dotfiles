---
title: /improve
---

# `/improve`

Hands this configuration to a fresh agent and asks it to make the setup better.

```
/improve                    spawn an improver
/improve focus on the MCP timeouts     spawn one with a focus
/improve view               open a past improver conversation
/improve list               list past improver conversations
```

## Its own context

The improver is a separate `pi` process. It gets a clean context window, its own model and thinking budget, and its own tool history — nothing leaks into the session you launched it from, and its exploration does not consume your context.

## Its brief

The improver is told, in order: the documentation is the source of truth; check the docs, update them when behaviour should change, then change the code. Where code and docs disagree it must fix the code, or say explicitly in its report that the docs are the stale side — it may not quietly rewrite the docs to match whatever the code happens to do.

It may edit files inside `~/kickstart/dotfiles/pi` and must run `link.sh` after adding one. It may not commit, push, or touch anything outside that directory.

## Watching it

Inside tmux, `/improve` opens a window named `pi-improve` running the improver interactively. The whole conversation is on screen and in scrollback, in its own window, separate from your session. The window stays open after the improver exits so the transcript survives.

Outside tmux it runs headless and writes to `<improve dir>/<name>.log`.

## The scoped view

Improver sessions are written to `~/.pi/agent/improve/`, a dedicated session directory. That separation is what makes them viewable in isolation — `/improve view` only ever lists improver conversations, never your normal work.

`/improve view` picks a conversation, exports it to HTML with `pi --session <path> --export`, and opens it. `/improve list` prints the same list without opening anything.
