---
title: Testing
---

# Testing

Three layers, all runnable now.

```bash
./tests/e2e.sh          # everything that costs nothing
./tests/e2e.sh --paid   # also real turns that spend tokens
node --experimental-strip-types --test tests/*.test.ts
```

## Units

The TypeScript `*.test.ts` files use plain `node:test` with no test-framework dependencies. They cover behavior where being wrong is **silent**:

- The bash classifier. A false "read-only" skips the permission prompt entirely, so the table covers pipelines, redirections, `sudo`, `git status` versus `git commit`, and unrecognised binaries (which must gate, not pass).
- Limit parsing. `$5` read as 5 tokens blocks instantly; `5` read as `$5` lets a session spend for hours. Both failures are quiet, so there is an explicit test that the two never agree.
- Kill-time parsing. A clock time already past today must roll to tomorrow, or `/kill 09:00` typed at 10:00 fires immediately.
- The subagent prompt filter, and that an unrecognised prompt passes through untouched rather than being mangled.

This is only testable because the logic lives in `lib/`, which imports nothing from pi. Extensions import from there, so the tests cover shipped code rather than a copy. **Put new pure logic in `lib/`.**

The e2e suite also invokes selected extension commands through a real Pi RPC process when a load check cannot reach the risky code. The `/dash` probe, for example, catches a command using a context method that does not exist before the overlay can render. These probes do not replace tmux inspection — they only prove the real command reaches its renderer without an API error.

`lib/` is symlinked into the agent directory alongside `extensions/`, because relative imports resolve from the symlink location, not the real path.

## End to end

`tests/e2e.sh` runs against the real binaries — no mocks, because the failures worth catching only happen against the real thing:

| Check | Catches |
| --- | --- |
| Every JSON config parses | A trailing comma that stops pi booting |
| `link.sh` twice against a temp `PI_CODING_AGENT_DIR` | Non-idempotent linking |
| Every link resolves, and into this repo | Dangling or stray symlinks |
| `pi --list-models` stderr | **Any extension failing to load** |
| `claude` / `claude2` registered as models | The custom provider silently not registering |
| `pi auth check` per provider | An expired credential |
| `claude`, `claude2` on `PATH` | A missing subagent binary |
| Every TypeScript `*.test.ts` file | Pure logic plus stateful queue/lifecycle regressions |
| Real RPC invocation of `/dash` | Command-time API drift before the overlay renderer opens |

`--paid` adds two real turns: one through the default model, and one through the `claude-code` provider asserting that usage came back non-zero — which exercises the subprocess, the stream-JSON parsing, and the usage mapping in one go.

The extension-load check is the highest-value line in the file. Load errors print to stderr before any model call, so it catches a broken extension for free.

## Look at it in tmux

Headless runs prove an extension **loads**. They do not prove it **looks right**.

```bash
tmux capture-pane -p -t <pane>
```

Several defects here were invisible headlessly and obvious in a capture: a spinner flush against the terminal edge, a duplicated working indicator, an MCP count printed twice. Anything that renders — statusline segments, widgets, overlays, dialogs — gets looked at before it is called done. This rule is in `APPEND_SYSTEM.md` and in the [`/improve`](./improve.md) brief, so an agent working here follows it too.

## What is not covered

Judgement. The skills, `APPEND_SYSTEM.md`, and the `/improve` brief are prompts; no assertion tells you whether they produce good work. They are validated by use.

Interactive flows — the `/dash` overlay, `/drive`'s selects, permission dialogs — are verified by tmux capture rather than automation. Driving the TUI programmatically is possible through `--mode rpc` and is the obvious next step if these start regressing.
