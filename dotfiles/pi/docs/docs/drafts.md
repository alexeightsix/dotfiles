---
title: /draft
---

# `/draft`

Prompts you are not ready to send, and prompts worth sending more than once.

```
/draft              save what is in the editor — or, if the editor is empty, retrieve one
/draft <name>       save the editor under that name, or retrieve that draft by name
/draft list         every draft, with its first line
/draft delete       pick one to remove
```

## Saving

Type a prompt, decide it is not ready, run `/draft`. The editor is cleared and the text is kept. With no name, the first line becomes the name.

If the editor already holds a draft you loaded, `/draft` **updates that draft** rather than creating a near-duplicate. That is what makes editing without sending work: load, change, `/draft`, and the same draft is now the edited version.

Passing a name always saves under that name, so `/draft other-idea` forks rather than overwrites.

## Retrieving

With an empty editor, `/draft` shows your drafts — name, age, and which project each was written in. Pick one and choose what to do with it:

| Choice | What happens |
| --- | --- |
| **Edit it** | Loads into the editor. Still saved. `/draft` writes your edits back to it. |
| **Send it now** | Sends without touching the editor. Still saved. |

Sending goes through the normal path, so the [send hold](./send-hold.md) still applies — a sent draft can still be caught with `/abort`.

## Files

Plain Markdown in `~/.pi/agent/drafts/`, one file per draft, with a one-line HTML comment carrying the name and the directory it was written in. Readable and editable by hand; anything unparseable is skipped rather than breaking the picker.

Drafts are global rather than per-project, because a well-worked prompt is usually worth reusing elsewhere. The picker shows the originating directory so you can tell them apart.
