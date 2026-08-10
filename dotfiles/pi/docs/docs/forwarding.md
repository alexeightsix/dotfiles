---
title: Forwarding
---

# Forwarding to another session

Start a prompt with `<<<<` and it is not sent to the current model. Instead you pick a session, and the content is delivered there as a prompt.

```
<<<< [clipboard]
<<<< have a look at this stack trace: [clipboard]
<<<< [last]
<<<< remember to bump the version before shipping
```

A picker opens listing your other sessions — name, when each was last active, and its project directory. Choose one and the message is on its way.

## Placeholders

Substituted inline, so they can sit inside a longer sentence.

| Placeholder | Expands to |
| --- | --- |
| `[clipboard]` | The system clipboard |
| `[last]` | The last assistant message in the current session |

`<<<<` on its own is shorthand for `<<<< [last]` — the common case of shunting an answer you just got into the session where it is actually needed.

## How it gets there

Pi has no way for one running instance to talk to another: RPC mode speaks over stdin/stdout, not a socket. So forwarding goes through an inbox on disk, at `~/.pi/agent/inbox/<session-id>.jsonl`.

Every session drains its own inbox when it starts and polls it every few seconds while running. That means:

- **Target is open** — it arrives within a few seconds.
- **Target is not running** — it waits, and arrives the moment that session is next opened or resumed.

Either way nothing is lost, and the sender does not need to know whether the recipient is live.

## Asking for it in a sentence

Forwarding is also a tool, so you can just say it:

> tell session spotlight-api this: the migration needs a down step

The model picks the session by name and forwards. It matches on the session name first, then on the id, and will not guess between two plausible targets — if the name is ambiguous it asks rather than picking.

Name your sessions with `/name <name>` and this becomes the natural way to use it. Unnamed sessions are only addressable through the `<<<<` picker.

## What the target sees

The message arrives as a normal user prompt and **starts a turn**, which is the point — you are handing that session work, not leaving a sticky note.

It is delivered as a follow-up, so a session that is mid-turn finishes what it is doing first rather than being interrupted. The receiving UI shows a notification.

By default the target receives **exactly what you forwarded** and nothing else — no wrapper, no provenance line.

## Configuring the wrapper

Text can be added before and after a forwarded message. Both are **blank by default**.

Configuration is scoped the same way Pi's own settings are — a global file, overridden per project:

| File | Scope |
| --- | --- |
| `~/.pi/agent/forwarding.json` | Global |
| `.pi/forwarding.json` | Project, overrides global |

```json
{
  "prefix": "[forwarded from {from} · {cwd} · {at}]\n\n",
  "suffix": ""
}
```

| Placeholder | Expands to |
| --- | --- |
| `{from}` | Sending session's name, or its short id |
| `{cwd}` | Sending session's working directory |
| `{at}` | When it was sent |

The default is blank because a wrapper is a claim about context the receiving model will act on. If you want it to know the message was forwarded, say so deliberately.

## What forwarding is not

It does not copy conversation context. Only the content you forwarded crosses over — the target has no idea what was being discussed in the sending session. If the message only makes sense with that background, forward the background too.

To move *yourself* between sessions rather than a message, use `Ctrl+Alt+S` — see [Sessions](./sessions.md).

## Interaction with the send hold

`<<<<` messages are never held. [Send hold](./send-hold.md) exists to stop a prompt reaching a model; a forward never reaches one, so there is nothing to hold. The picker is the confirmation step.
