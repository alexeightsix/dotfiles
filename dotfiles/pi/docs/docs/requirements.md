---
title: Requirements
sidebar_position: 2
---

# Requirements

Every request made of this project, and what happened to it. Append-only: entries change status, they are never deleted.

This exists so that “did we do everything?” has an answer that is looked up rather than remembered. Requirements arrive scattered through conversations; without a ledger, the only record is a transcript nobody will re-read.

Rows 1–39 are a backfill from the 2026-08-10 changelog. Later rows were recorded when they arrived.

**Status meanings**

| Status | Means |
| --- | --- |
| `done` | Built **and verified**. The verification is named. |
| `partial` | Some of it works. What is missing is stated. |
| `open` | Accepted, not started. |
| `blocked` | Cannot proceed. The blocker is named, and whose it is. |
| `declined` | Deliberately not doing it. The reason is recorded. |
| `withdrawn` | The requester dropped it. |

`done` requires evidence. “Written” is not `done`. If it loaded but was never exercised, it is `partial`.

## Open and partial

| # | Requirement | Status | What remains |
| --- | --- | --- | --- |
| 5 | `/drive` classifies requests and selects an available model and effort level | partial | Select UI is visually verified; applying a route and the reactive exhaustion fallback still need live verification. |
| 7 | Plan mode constrains tools and records a reviewable plan | partial | Extension loads; no current end-to-end interaction evidence was recoverable during backfill. |
| 11 | The statusline presents the configured operational state | partial | Current idle, held and working layouts are visually verified; narrow-terminal behavior and non-zero cache formatting still need live inspection. |
| 13 | `/stats` reports model, tool, subagent and compaction usage | partial | Extension loads; output has not been exercised during this takeover. |
| 14 | `!` and `!!` shell commands are logged per session with hidden entries marked | partial | Extension loads; no current end-to-end interaction evidence was recovered. |
| 15 | `/gc` reports and prunes old sessions | partial | Extension loads; destructive prune path has not been exercised during this takeover. |
| 17 | Lazy MCP servers load and Linear writes remain gated | partial | Config parses; individual lazy connections and the write gate were not exercised during this takeover. |
| 19 | `/improve` launches a fresh scoped self-review | partial | Extension loads; no live self-review was started during this takeover. |
| 27 | Remote session discovery and RPC-over-SSH handoff | open | Roadmap only; Pi has no daemon/socket discovery, so an explicit host list is still required. |
| 29 | `/draft` saves global Markdown drafts and offers edit/send actions | partial | Both picker stages are visually verified; saving, editing and send-now behavior still need live exercise. |
| 30 | `/limit` blocks new turns at a money or token cap without destroying the session | partial | Parser and recovery tests pass; pane `%142` exercised a live hard token cap and retained prompt, while the dollar-cap path remains headless-only. |
| 31 | `/kill` stops immediately or on a schedule | partial | Time-parser tests pass and extension loads; shutdown behavior has not been exercised. |
| 36 | Notifications fire only when Pi needs attention and its pane is not visible | partial | Four focus-detector tests and a real `/notify test` toast pass; an automatic attention/settled trigger while hidden remains unverified. |
| 37 | Statusline order, compact formatting and narrow-terminal dropping follow importance | partial | Wide idle/held/working layouts pass pane inspection; narrow-terminal dropping remains unverified. |
| 50 | Add tools for web scraping | open | Future feature; scope, sites, extraction needs and safety constraints are not decided yet. |
| 55 | Produce one JSON snapshot of spend, remaining limits, account state and useful usage for Claude, Claude2, OpenCode and Codex | partial | Live collection and normalization succeed for all four, but OpenCode Go live remaining stays `null` until the CLI has an authenticated read-only Console source. |

## Delivered

| # | Requirement | Status | Verified by |
| --- | --- | --- | --- |
| 1 | Treat documentation as the specification and code divergence as a defect | done | `APPEND_SYSTEM.md` is linked by `link.sh`; inherited `./tests/e2e.sh` passed 15/15 on 2026-08-10. |
| 2 | Link tracked Pi configuration into `~/.pi/agent` idempotently | done | Inherited e2e: 31 links, no dangling links, all targets in the repository. |
| 3 | Configure scoped model cycling and model defaults | done | `settings.json` parses in e2e and scoped models are present in the shipped configuration. |
| 4 | Register `claude` and `claude2` as selectable primary providers | done | Inherited e2e found both registrations and both CLIs on `PATH`. |
| 6 | Provide `all`, `ask` and `read-only` permission modes with runtime path grants | done | 25 read-only classifier assertions pass; permission extensions load in e2e. |
| 8 | Support compact, fork, tree, clone, switch, name and session interruption controls | done | Built-in Pi behavior was exercised during initial configuration and the current config/keybindings parse in e2e. |
| 9 | `/notes` records text without sending it to a model | done | Delivered behavior recorded in the 2026-08-10 changelog; extension loads in current e2e. |
| 10 | Apply the documented key overrides and cap autocomplete at 10 rows | done | Config parses in e2e; pane `%115` showed exactly 10 of 92 slash-command matches. |
| 16 | Install only general global skills; keep project-specific skills local | done | `link.sh` target audit passes in current e2e. |
| 18 | Run Claude subagents in bounded persistent slot pools | done | Both Claude CLIs are present; slot helper and prompt-filter assertions pass. |
| 20 | Test pure shipped logic and real extension/config loading | done | `tests/unit.test.ts` passes 51 assertions; inherited e2e passes 15/15. |
| 21 | Idle prompts wait in a five-second FIFO send-hold queue | done | 14 queue/lifecycle tests pass; fresh tmux pane showed FIFO `+1`, latest-only `/abort`, and clean `/reload`. |
| 28 | Send-hold renders a countdown and queue preview above the editor | done | Captured fresh pane `%44`: 30-second test hold, preview, `…and 1 more`, and `hold 30s +1 /abort`. |
| 40 | Add and maintain this append-only requirements ledger | done | Docusaurus production build passes; final repository e2e passes 16/16. |
| 44 | Visually verify the current statusline layout | done | Fresh panes `%43`/`%44` captured idle, held and working layouts after loading the current build. |
| 49 | Review Claude’s send-hold implementation against Pi’s extension API and fix verified defects | done | Installed Pi docs/API reviewed; 14 regression tests, docs build, e2e 16/16, and live tmux hold/reload captures pass. |
| 42 | Prove a `<<<<` forward is consumed by a live receiving TUI session | done | Fresh source/target panes: picker selected `forward-target-live`, target captured `Forwarded from forward-source-live`, inbox was consumed, and its session file contains exactly one forwarded user message. |
| 12 | `/dash` shows the complete agent capability dashboard | done | Real RPC command probe passes; fresh tmux overlay captured model, models, cwd, MCP, tools, disk and spend sections after fixing API drift and tool-column spacing. |
| 45 | Visually verify the `/dash` overlay | done | Fresh pane captures covered the first page and scrolled lower sections; tool names have readable gaps. |
| 46 | Visually verify `/drive` selection dialogs | done | Fresh pane captured all five routing categories and the `drive → waiting` statusline segment. |
| 47 | Visually verify the `/draft` picker | done | Fresh pane captured the draft list and the edit/send action picker using a temporary Markdown fixture, then removed it. |
| 48 | Fire and observe a real notification toast | done | `/notify test` reported hidden detection and dunst history recorded app `pi`, summary `pi · test`, body `Notifications are working`, id 519. |
| 22 | Count compactions in session statistics | done | Delivered behavior recorded in the 2026-08-10 changelog; extension loads in e2e. |
| 23 | Keep project-only component extraction rules out of global configuration | done | Link audit confirms only tracked global skills are installed. |
| 24 | Persist forwarded messages without loss using a configurable, blank-by-default wrapper | done | Three wrapper assertions pass; inbox persistence was previously proven. Live consumption is tracked separately in row 42. |
| 26 | `/zen` hides the statusline | done | Delivered behavior recorded in the 2026-08-10 changelog; extension loads in e2e. |
| 32 | `/docs` serves the local Docusaurus site and supports loose page matching and stop | done | Four real-socket server-detection tests cover IPv4, IPv6, free and held ports; extension loads in e2e. |
| 33 | `/demo` proves features in an appropriate real medium | done | Skill is installed by the passing link audit; medium-selection behavior is specified and was delivered in the 2026-08-10 demo work. |
| 34 | Remove parent-only tools and Pi documentation pointers from Claude subagent prompts | done | Four prompt-filter assertions pass. |
| 35 | Detect live docs servers over HTTP across IPv4 and IPv6 | done | Four `lib/local-server.ts` assertions use real sockets and servers. |
| 38 | Ship the reusable `source-of-truth` skill and requirements-ledger template | done | Skill and asset exist through the passing link audit; this page was bootstrapped from the shipped asset. |
| 39 | Let demos choose browser, tmux, curl, database CLI or diff and preserve non-obvious setup | done | Delivered behavior recorded in the 2026-08-10 changelog and installed skill. |
| 54 | Show remaining Claude subscription quota proactively | done | A live collection refreshed both account caches through isolated `/usage` probes and returned current windows; direct JSON inspection and the paid repository e2e suite passed. |
| 56 | Render the snapshot in a minimal Tailwind CDN and Alpine.js dashboard that recollects on refresh | done | Same-origin refresh returned four healthy agents; foreign Host and cross-origin requests returned 403; a real Chrome capture verified the two-column cards, progress bars, warning state and raw-JSON section. |
| 57 | Provide a `spend` command that prints the generated usage JSON, and serves the dashboard with `--serve` | done | `command -v` resolves the tracked symlink; a missing temporary snapshot was collected with four healthy agents and mode `0600`; the default command wrote the snapshot to stdout, and `--serve` bound loopback and answered `/` and `/usage.json` with 200. |
| 58 | Scrub sensitive agent-usage details through CLI options, with scrubbing enabled by default | done | Default and strict snapshots contained no email patterns; strict removed granular keys; `--no-scrub` retained identity only explicitly; legacy/full files were sanitized before opening or serving; default commands preserved stricter existing files; strict dashboard refresh returned four healthy agents and Chrome showed no identities. |
| 59 | Syntax-highlight rendered code blocks, including Bash tool calls with embedded-language heredocs | done | Five inference/parser regressions pass; e2e 16/16; pane `%88` showed Bash, Python heredoc and inferred Markdown fence tokens in distinct Rose Pine syntax colours. |
| 25 | `/todo` maintains several session-scoped plans and renders progress | done | Current-session tool calls created and updated separate lists; filesystem inspection found one title-derived JSON file per list under the session directory. |
| 41 | Stop `/` autocomplete from shifting the layout | done | `autocompleteMaxVisible` is 10; narrow pane `%115` showed exactly 10 visible matches and paged count `(1/92)`. |
| 43 | Store one title-derived JSON file per `/todo` list | done | The delegated scalable choice matches the implementation; current session contains separate files for each concurrently active plan. |
| 60 | Keep questions awaiting the user's answer visible when the transcript scrolls | done | Three lifecycle assertions and e2e pass; pane `%115` restored two questions above the editor and an ordinary held answer cleared them while commands remained available. |
| 61 | Rename the held-queue release command to `/send` and add `Ctrl+Enter` as its keyboard alias | done | Fifteen send-hold regressions pass; pane `%115` showed the `/send` hint and live `Ctrl+Enter` reached the handler with `Nothing held.` |
| 64 | Copy a rendered code snippet with a one-step interaction | done | Three selection regressions and e2e pass; pane `%115` showed the shortcut hint, `/copy-code` and live `Ctrl+Alt+C` both replaced the X11 clipboard with the exact mixed-language command. |
| 65 | Use the upstream Matt Pocock installation as the sole canonical `grill-me` skill | done | `.agents/.skill-lock.json` identifies `mattpocock/skills`; the repo copy/link were removed, e2e link audit passed, and pane `%115` started without a skill-collision warning. |
| 66 | Keep and display per-step session token cost and elapsed time history | done | Three projection/timing regressions and e2e 16/16 pass; pane `%118` showed exact and estimated model/tool durations, token categories, per-step cost and cumulative spend in the `/costs` overlay. |
| 62 | Add `/pause` with duration presets and a custom-duration choice | done | Pause/queue regressions and e2e 16/16 pass; pane `%142` showed the preset picker, paused FIFO widget/status, `/pause off`, and the deadline restored after `/reload`. |
| 63 | At a hard token cap, offer pause-and-retry, switch-model-with-handoff, or cancel | done | Five guardrail recovery assertions plus send-hold cancellation pass; pane `%142` showed the live three-choice menu and alternate-model picker, while the switch regression proves allowance reset and injection of the upstream handoff workflow with the retained prompt. |
| 67 | Move the agent-usage code out of the kickstart repository into `~/dev/spend` | done | `command -v spend` resolves through `~/.local/bin/spend` to `/home/alex/dev/spend/spend` and printed a live snapshot; `stage-03.sh`, `install.md` and the agent-usage page point at the new path. |
| 68 | Make `spend` print the snapshot JSON instead of opening an editor | done | Piped output is byte-identical to the snapshot and TTY output goes through `jq`; `--refresh` recollected four healthy agents in 4.5s; the mutually-exclusive and unknown-option paths still exit 2. |
| 69 | Install the dashboard as a systemd user service | done | `install.sh` writes, enables and restarts `spend.service`; under systemd a `POST /api/refresh` returned all four agents `ok`, proving the explicit unit `PATH` reaches the agent CLIs; `--uninstall` left no unit and no symlink, and reinstalling returned the service to `active`. |
| 70 | Serve the dashboard on port 8888 | done | Unit `ExecStart` carries `--port 8888` and `http://127.0.0.1:8888/` answered 200; `--port` on `install.sh` and `spend` was exercised on 7777/4313. |
| 71 | Recollect the dashboard snapshot every minute | done | With the tab left idle, the service logged `POST /api/refresh` 60s after page load; the header countdown reports the next collection and the checkbox state persists in `localStorage`. |
| 72 | Present one provider per row, sorted alphabetically, without raw JSON or collection detail | done | A 1440px Chrome capture shows Agent/Limits/Spend/Usage rows in the order Claude, Claude 2, Codex, OpenCode, with the raw-JSON panel, source-method line and warning text removed. |
| 73 | Let `spend --serve` cooperate with an already-running dashboard | done | Against a live dashboard it reported the running URL and opened it instead of binding; against a foreign listener on 4399 it refused with exit 1. |
| 74 | Document how each provider's spend and usage is actually obtained, and whether an official API could replace it | done | `docs/collection.md` covers the tmux `/usage` probe and state cache, the Codex app-server JSON-RPC methods, and the OpenCode local database, field by field; `docs/apis.md` records that the published Anthropic and OpenAI usage APIs meter API-key billing rather than subscription windows, that Codex's local JSON-RPC is the one genuine API of the four, and that OpenCode Go's balance stays `null` by choice. |
| 75 | Rename the tool from `spend` to `burn` and publish it | done | Tool, binary, module, unit, port env and cache path renamed (`~/dev/burn`, `burn`, `burn.py`, `burn.service`, `BURN_PORT`, `~/.cache/burn`) while the JSON contract's own `spend` fields are untouched; the reinstalled unit collected four `ok` agents over `/api/refresh` and the CLI printed the snapshot; pushed to github.com/alexeightsix/burn. |

## Latest additions

| # | Requirement | Status | What remains |
| --- | --- | --- | --- |
| 115 | Make the pi-vim wrapper global: only EX `:w`/`:W` submits, EX `:q` quits, and the compact colored mode label renders above the prompt border in every working directory | done | `link.sh` installed the tracked global extension; fresh tmux Pi sessions in `/tmp` and Pistafit showed colored INSERT/EX labels immediately above the border, blocked Enter and Ctrl+Enter, submitted exact witness payloads once through `:W` and `:w`, and exited through `:q`. This supersedes #103's Ctrl+Enter submission behavior; #122 supersedes its mode-label placement. |
| 122 | Remove the separate editor mode row and show Vim mode as the far-left statusline segment, before all existing statuses | done | ANSI-preserving captures from a fresh 160-column Pi TUI showed exactly one colored INSERT, NORMAL, VISUAL, V-LINE, and `EX :W_` indicator at the statusline's left edge, with no mode text in the editor; `:W` still submitted the exact witness once and `:q` exited. |

## Blocked and declined

| # | Requirement | Status | Reason |
| --- | --- | --- | --- |
| 51 | Use `opencode-go/kimi-k3` successfully | blocked | External provider/workspace failure reported by the user; explicitly not configuration code to fix. |
| 52 | Use `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free` | blocked | `OPENROUTER_API_KEY` is a placeholder pending rotation; external credential issue. |
| 53 | Use `openrouter/openai/gpt-oss-20b:free` | blocked | `OPENROUTER_API_KEY` is a placeholder pending rotation; external credential issue. |

## Keeping it honest

- Add the row **when the request arrives**, not when it is finished. A requirement that only appears once satisfied is a requirement that can be quietly forgotten.
- Record requests you decline and why. A decision with no record gets re-litigated.
- Split a request that has parts. One row per thing that can independently succeed or fail, or the status is a lie about half of it.
- Re-read this before answering “is it all done”. That is the entire point of the file.
