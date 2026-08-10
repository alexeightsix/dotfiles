---
title: Roadmap
sidebar_position: 98
---

# Roadmap

Wanted, not built. Each entry records what it should do and what standing in the way, so picking one up does not start from scratch.

## Notification sink for other apps

**Want:** notifications written to a file or fifo as well as sent to dunst, so a bar, a phone bridge, or another machine can consume them.

Cheap to add: `notify.ts` already funnels every toast through one function, so a JSONL append next to the `notify-send` call covers it. The open questions are where it lives (per-session under the agent dir, or one global stream) and whether anything should rotate it — see [/gc](./housekeeping.md), which already prunes the other append-only logs.

## `/remote` — pipe into a running session from another terminal

**Want:** `/remote` puts a session into a receive-only state — input bar hidden or disabled — and then, from any other terminal:

```bash
echo 'hello' | pi remote <session-id>
```

lands in that session as a prompt. On entering the mode, the exact command to pipe into is copied to the clipboard, so there is nothing to retype.

### What exists already

[Forwarding](./forwarding.md) is most of the transport. A session already drains an on-disk inbox at `~/.pi/agent/inbox/<session-id>.jsonl` every few seconds, and delivers what it finds as a prompt. Anything that appends a correctly-shaped envelope to that file already works — including a shell one-liner.

So the smallest honest version is a **small binary or script** that writes an envelope to a session's inbox:

```bash
pi-remote <session-id> <<< 'hello'
```

That is a few lines around `jq`/`printf`, needs no protocol, and works today against the existing drain loop. Worth building first and living with before anything larger.

### The correct version

RPC. `pi --mode rpc` accepts JSON commands on stdin, so a session started in RPC mode can be driven properly rather than poked through a file — with real acknowledgement, real errors, and no polling delay. The gap is that RPC mode and the interactive TUI are different modes today: you get one or the other, not a TUI session that also listens on a pipe.

Bridging that is the actual work, and it is the same bridge [remote sessions](#remote-sessions) needs. Doing `/remote` through RPC first would make the remote case mostly free.

### Deliberate design points

- **Clipboard on entry** — the mode is useless if you have to look up your own session id. Copying the full command is the difference between a feature and a party trick. `xclip`/`wl-paste` are already used by forwarding.
- **Hiding the input bar** is the point, not decoration: it makes the state unambiguous, so you do not type into a window that is no longer listening to you.
- **Receive-only is a safety property.** Anything that can pipe into a session can start a turn that spends money, so the inbox path should stay per-session and unguessable, and `/limit` should apply to piped prompts exactly as it does to typed ones.

## Remote sessions

**Want:** connect to a Pi session on another machine from the local editor — the same `Ctrl+Alt+S` picker, but the list includes sessions on other hosts, and choosing one attaches to it.

### What already works today

Two things get partway there and cost nothing:

- **`ssh host -t tmux attach`** — a full remote Pi in a tmux pane. It is a *terminal* on the other machine, not integration: local `/stats`, `/dash`, and forwarding know nothing about it.
- **A shared `sessionDir`** — `sessionDir` in `settings.json` (or `--session-dir` / `PI_CODING_AGENT_SESSION_DIR`) accepts any path, so pointing several machines at one synced directory makes remote transcripts *resumable* locally. Not attachable: resuming a session another machine is live in would have two writers on one JSONL.

### The three real designs

| Approach | How | Cost |
| --- | --- | --- |
| **Resume-only** | Sync `sessionDir` between hosts | Nearly free; no live attach, and needs a lock to stop two hosts writing one file |
| **Drive over RPC** | `ssh host pi --mode rpc`, local TUI as the client | Genuine remote sessions; needs an RPC client wired to the local UI. `--mode rpc` speaks JSON over stdin/stdout, so SSH is the whole transport |
| **Remote tools only** | The `ssh.ts` pattern — read/write/edit/bash execute on the remote, the session stays local | Smallest useful step; the conversation, cost, and context stay on this machine |

`--mode rpc` over SSH is the one that actually delivers what is wanted. Pi already ships an RPC client (`rpc-client.ts`) for exactly this shape of embedding, so the work is wiring it to the local TUI rather than inventing a protocol.

### Blocker worth knowing about

There is no discovery. Pi has no daemon and no socket, so nothing enumerates "sessions on host X" without shelling in and listing the remote `sessionDir`. Any picker starts with an explicit host list — the same reason [forwarding](./forwarding.md) uses an on-disk inbox instead of talking to a running process.

### Knock-on effects

- [Forwarding](./forwarding.md) would extend naturally: the inbox is a directory, so a synced or per-host inbox makes `<<<<` work across machines with no protocol change.
- [`/stats`](./stats.md) and [`/gc`](./housekeeping.md) assume one local agent directory and would need a host dimension.
- Credentials stay per machine — a remote session uses the remote host's `auth.json`, which is a feature, not a gap.
