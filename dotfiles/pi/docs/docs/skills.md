---
title: Skills
---

# Skills

Skills are on-demand instruction packages. Configuration-owned skills live in `skills/` here and are linked into `~/.pi/agent/skills/`. Third-party skills installed into `~/.agents/skills/` are discovered globally without another Pi-specific copy.

`enableSkillCommands` is on, so each skill is also a slash command.

## `grill-me`

```
/skill:grill-me
```

This is the upstream `mattpocock/skills` wrapper installed at `~/.agents/skills/grill-me`; its `grilling` primitive holds the full interview behavior. The upstream installation and `.agents/.skill-lock.json` are canonical so updates retain their provenance. This repository must not link a second `grill-me` copy into `~/.pi/agent/skills/`.

It runs a relentless design interview, mapping the subject as a decision tree and asking the current frontier of questions in rounds. `disable-model-invocation: true` means it only runs when you ask for it.

## `pr-review`

```
/skill:pr-review
/skill:pr-review 1234
```

Reviews a PR, a branch, or the current diff. Correctness first — wrong values, observable partial state, unhandled inputs, lost errors, leaked resources, injection, contract drift with callers. Reuse and simplification findings come second and are grouped separately so they read as optional.

It is instructed to try to disprove each finding before reporting it: construct the triggering input, check whether a guard already makes it impossible, re-read the code rather than the diff. Findings that cannot be made concrete are dropped rather than hedged.

## `demo`

```
/demo /draft
/skill:demo
```

Shows a feature working instead of describing it: opens a tmux pane, drives the real thing, captures the pane to confirm, and leaves it on screen. Carries the tmux mechanics so the agent does not have to work them out, and one rule — capture before claiming success, because a keystroke sent is not evidence a feature worked.

See [/docs and /demo](./docs-command.md).

## Adding one

Create `skills/<name>/SKILL.md` with `name` and `description` frontmatter, then re-run `link.sh`. Directories containing a `SKILL.md` are discovered recursively.

To borrow skills from another harness, add its directory to `settings.json`:

```json
"skills": ["~/.claude/skills"]
```

## `source-of-truth`

```
/skill:source-of-truth
```

Bootstraps a project onto the method this configuration was built with: documentation as the specification, a requirements ledger, a changelog that records *why*, and verification rules.

Run it in a project root and it sets up a Docusaurus site, the three standing pages (`intro`, `requirements`, `changelog`), a `.pi/APPEND_SYSTEM.md` binding the working order into every session, and a portable `/docs` command.

It ships two assets:

| Asset | Becomes |
| --- | --- |
| `assets/docs.ts` | `.pi/extensions/docs.ts` — self-contained `/docs`, finds the site by walking up, derives a per-project port |
| `assets/requirements.md` | `docs/docs/requirements.md` — the append-only request ledger |

The requirements ledger is the part worth stealing on its own. Rows are added when a request **arrives**, not when it is finished, and `done` requires named evidence — so "did we do everything?" is answered by looking it up rather than remembering.
