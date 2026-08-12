---
title: Changelog
sidebar_position: 99
---

# Changelog

Every edit to this documentation gets an entry here. The docs are the source of truth for the configuration, so a change to them is a change to the specification — it needs a record, in the same way a code change needs a commit message.

**Rule:** never edit a page without logging it here, and always state **why**. What changed is recoverable from git; why it changed is not.

**Format:** newest first, dated. Each dated block opens with the reason for the change, then one bullet per page saying what the behaviour now is — not what was typed.

## 2026-08-12 — Vim prompt behavior belongs to the home configuration

**Why:** submission keys and editor-state presentation are personal Pi behavior;
keeping them in one project made the editor inconsistent elsewhere, and placing
the mode below the prompt made state arrive after the thing it describes.

- **vim prompt** — new page. The global pi-vim wrapper makes EX `:w`/`:W` the
  only submission path, keeps EX `:q`, and renders the compact colored mode label
  above the prompt's top border in every working directory.
- **requirements** — global ownership and above-input rendering supersede the
  project-local wrapper and Ctrl+Enter submission behavior.

## 2026-08-10 — session spend needs a chronological explanation

**Why:** totals and per-model aggregation cannot answer which individual step was slow or expensive. The transcript already owns provider usage, so a useful history should add measured elapsed time without creating a second accounting source that can drift.

- **stats** — `/costs` opens a branch-scoped model/tool timeline with elapsed time, token categories, per-step cost and cumulative spend; new timing records persist in-session while older steps use visibly estimated adjacent-message timing.
- **requirements** — per-step token, cost and elapsed-time history is delivered with projection/timing regressions, full e2e, and a live overlay showing exact and visibly estimated durations.

## 2026-08-10 — copying a rendered snippet should be one action

**Why:** selecting a multiline Bash/Python card by dragging is unnecessarily precise, while Pi’s extension interface provides no clickable or double-clickable transcript regions. The available affordance should still be visible where the code appears.

- **code-rendering** — Bash cards advertise `Ctrl+Alt+C copy`; that shortcut and `/copy-code` copy the most recent rendered Bash command or fenced snippet.
- **keybindings** — `Ctrl+Alt+C` is the snippet-copy shortcut.
- **requirements** — one-step snippet copying is delivered with selection regressions, full e2e, a live shortcut, and exact X11 clipboard evidence.

## 2026-08-10 — a token cap should lead to a decision, not a dead end

**Why:** reaching a hard token cap can mean waiting for capacity, moving the work to another model, or stopping intentionally. Silently discarding the blocked prompt forces the user to reconstruct both the decision and the work.

- **guardrails** — the hard-token-cap path retains the blocked prompt and offers pause-and-retry, model switch with a redacted Matt Pocock handoff, or cancel; dollar caps remain direct blocks.
- **requirements** — the token-cap decision flow is delivered; regressions cover pause, handoff switch, allowance reset and cancel, and a live pane shows both decision stages.

## 2026-08-10 — timed pause needs an explicit scope

**Why:** the requested `/pause` duration picker is clear about presets and custom input, but “pause” could mean interrupting active work or delaying future work. That semantic choice must be visible rather than silently guessed.

- **guardrails** — `/pause` lets the active turn finish, queues future work, survives reload/resume, exposes 5m/15m/1h/custom choices, and resumes FIFO work automatically at expiry; model switching at a token cap restarts the same allowance for the selected model.
- **requirements** — pause and token-cap recovery are delivered with guardrail/send-hold regressions, full e2e, and live preset, queued-pause, reload-restoration, decision-menu and model-picker evidence.

## 2026-08-10 — release held work with `/send`

**Why:** `/send` states the action more directly than `/now`, and a modified Enter shortcut makes the fast path available without opening slash autocomplete.

- **send-hold** — `/send` is the immediate FIFO release command and `Ctrl+Enter` is its terminal-supported keyboard alias; the old `/now` and `/force` names are no longer part of the interface.
- **keybindings** — `Ctrl+Enter` releases held prompts immediately.
- **requirements** — the command rename and shortcut are delivered with 15 queue regressions and a live `Ctrl+Enter` handler probe.

## 2026-08-10 — outstanding questions stay beside the editor

**Why:** a question that exists only in the transcript can scroll out of sight while the user investigates or the session continues, leaving the agent blocked on an invisible decision.

- **questions** — new page. The agent pins outstanding questions in a session-scoped widget above the editor; an ordinary answer clears it, commands and forwards preserve it, and `/questions clear` is the explicit escape hatch.
- **requirements** — persistent outstanding-question visibility is delivered with lifecycle regressions and a live pane proving restore and answer-time clearing.

## 2026-08-10 — settle the three pending editor choices

**Why:** autocomplete height, todo persistence and duplicate skill ownership had deliberately awaited user decisions. The user approved a shorter menu and delegated the two architecture choices, so the configuration now needs one unambiguous contract for each.

- **keybindings** — slash autocomplete shows at most 10 rows, limiting transcript displacement while retaining paged access to longer result sets.
- **todo** — one title-derived file per list is canonical because independent updates avoid whole-session rewrites and isolate malformed or hand-edited plans.
- **skills** — the lockfile-backed `mattpocock/skills` installation under `~/.agents` is the canonical `grill-me`; Pi must not link a divergent duplicate.
- **intro** — the tracked skills inventory distinguishes configuration-owned skills from globally discovered third-party skills.
- **requirements** — all three decisions are delivered: 10-row live autocomplete, separate current-session todo files, and a collision-free pane using the sole upstream `grill-me`.

## 2026-08-10 — usage snapshots are private by default

**Why:** the JSON and dashboard included account email addresses even though identity was irrelevant to deciding where capacity remained. Privacy should fail closed: ordinary commands must produce a share-safer snapshot, while retaining sensitive detail requires an explicit choice.

- **agent-usage** — `collect`, `serve`, and `spend` default to identity scrubbing. `--scrub strict` also removes granular model/provider and usage history; `--no-scrub` explicitly retains normalized identity details. Every snapshot declares its privacy mode, and a server never serves an older file at a weaker privacy level than requested.
- **requirements** — default identity scrubbing and strict/full controls are delivered with live JSON, legacy-file, fail-closed downgrade, dashboard-refresh, and real-browser evidence.

## 2026-08-10 — the usage JSON gets a direct command

**Why:** the collector and dashboard produced a useful private JSON file, but reaching it still required remembering a long cache path or collector invocation. The requested shell command should open the existing artefact without unexpectedly recollecting every time.

- **agent-usage** — `spend` opens `~/.cache/agent-usage/usage.json` in `$VISUAL`, `$EDITOR`, or `nvim`; it collects only when the file does not exist. Dashboard Refresh or the explicit collector remains the way to update an existing snapshot.
- **install** — `stage-03.sh` links the tracked `spend` executable into `~/.local/bin`, which is already on the configured shell path.
- **requirements** — the `spend` command is delivered with direct symlink, missing-snapshot, private-file-mode, and live nvim evidence.

## 2026-08-10 — rendered code needs language-aware colour

**Why:** live Bash tool cards showed shell commands and embedded Python heredocs as one flat block colour, making structure harder to scan and defeating the syntax palette already defined by the theme.

- **code-rendering** — new page. Bash tool calls use shell highlighting, heredoc bodies switch to a language resolved from their interpreter, target filename or conventional delimiter, and unlabelled Markdown fences are inferred only from conservative signatures. Unknown code stays plain rather than accepting a confident wrong guess.
- **requirements** — syntax highlighting is delivered with parser regressions, full e2e, and a live pane showing Bash, embedded Python, and inferred Markdown fences in distinct Rose Pine syntax colours.

## 2026-08-10 — visual verification catches `/dash` before rendering

**Why:** the first real pane capture of `/dash` did not show an overlay; it exposed a command-time API error instead. After that was fixed, scrolling the real overlay exposed tool names joined with no gap. Extension loading could catch neither defect, so the standard suite needed a real command probe and rendered features needed the missing visual evidence recorded explicitly.

- **testing** — the TypeScript test command and e2e suite run every `*.test.ts`; a real Pi RPC probe invokes `/dash` up to its renderer while tmux remains mandatory for the rendered result.
- **requirements** — `/dash`, `/drive`, `/draft`, the current statusline and a real dunst toast now have named live evidence; automatic hidden-pane notification triggering remains partial rather than being inferred from the test toast. A reload-time `grill-me` collision with the separately discovered `~/.agents` copy is recorded as open pending a canonical-source decision.

## 2026-08-10 — forwarding delivery is evidence, not an assumption

**Why:** forwarding had proved that inbox writes were not lost, but had never proved that a running destination consumed one into its TUI. Persistence and delivery are separate claims and the ledger needed to stop carrying the latter as unresolved once it was observed.

- **requirements** — live `<<<<` delivery is done: a fresh source selected a fresh named target, the target displayed the sender and forwarded prompt, the inbox was consumed, and the target transcript recorded exactly one forwarded user message.

## 2026-08-10 — send-hold survives the real Pi lifecycle

**Why:** reviewing the queue against Pi’s installed extension API found defects that the fake single-extension harness could not expose: timers survived session replacement, extension-injected releases could be swallowed or classified twice, RPC images could be dropped, `/now` forced only the first countdown, and waiting UI could stick at zero. A send safeguard must not introduce message loss or crash the editor.

- **send-hold** — the hold is TUI-only and session-scoped; all `/now` countdowns are cleared, queued work visibly waits behind an active turn, extension replays are not reinterpreted by notes or drive, and a hard spend limit pauses rather than loses the next held message.

## 2026-08-10 — requirements become recoverable state

**Why:** requests, unresolved verification and external blockers were scattered between the changelog and handoff notes, so “is everything done?” still depended on remembering a conversation. The future web-scraping request also needed somewhere durable to wait without being mistaken for current work.

- **requirements** — new append-only ledger, backfilled from the changelog and takeover handoff. It separates delivered, partial, open and externally blocked work, names required evidence, and records web-scraping tools as a future feature pending scope.

## 2026-08-10 — cross-agent usage has an honest common view

**Why:** spend and quota were scattered across four CLIs, and the routing documentation's blanket claim that no provider exposes remaining usage had become false after Codex added a read-only rate-limit API. A dashboard is only useful if it preserves the difference between billed dollars, observed local cost, and subscription utilization instead of adding unlike figures or manufacturing an OpenCode balance.

- **agent-usage** — new page. A local Alpine.js and Tailwind CDN dashboard refreshes a normalized JSON file by querying Claude and Claude2 through isolated `/usage` tmux probes, Codex through app-server JSON-RPC, and OpenCode through its own local database command. Unknown live balances remain `null`, collection is prompt-free, and per-agent failures remain visible without discarding successful data.
- **drive** — quota availability is provider-specific: Codex has a structured read interface, Claude requires an interactive usage refresh, and OpenCode Go's provider key has no live allowance endpoint. Drive remains reactive because it does not run the collector before routing.
- **requirements** — the two-account Claude quota view and refresh-driven browser dashboard are delivered with live, security and real-browser evidence. The four-agent JSON remains partial only because OpenCode Go has no authenticated live-allowance source on this machine; its unknown remaining value stays explicit rather than estimated.

## 2026-08-10 — send-hold queue documentation catches up

**Why:** the second-prompt loss bug had already been fixed in code, but its page still specified replacement-style single-message behaviour. Because these docs govern the configuration, leaving that stale would make the correct FIFO implementation look defective and tell users the wrong way to cancel queued work.

- **send-hold** — idle prompts wait in a FIFO queue; `/abort` removes only the newest, `/abort all` clears the queue, and `/now` starts flushing it. Mid-turn input bypasses the hold for Pi's steering queue.

## 2026-08-10 — demos pick their medium

**Why:** the demo skill assumed everything was a terminal program. Demoing a web page in a tmux pane, or an API by describing it, is not evidence — and the whole point of the skill is evidence. Separately, a demo that took real setup left nothing behind, so the next one rediscovered it.

- **docs-command** — `/demo` now selects the medium from what is being demoed: tmux for TUIs, a real browser via the chrome-devtools MCP server for web, `curl -i` for APIs, the database CLI for SQL, a diff for file transformations. The heuristic recorded is "what would you do to check this by hand".
- **docs-command** — the skill now writes a `demo-<thing>` skill when a demo required non-obvious setup (a dev server, seed data, a token, a viewport, a wait), and fixes an existing one that proved wrong. Explicitly does not write one for the obvious.
- **docs-command** — `/demo` no longer refuses outside tmux; it tells the agent no pane is available so a non-terminal medium is chosen instead.

## 2026-08-10 — notifications, and statusline priority order

**Why:** a permission prompt that blocks the agent is worthless on a workspace you are not looking at. Separately, the statusline had grown by accretion rather than by importance, so the things you glance at mid-task were competing for space with things you already know.

- **notifications** — new page. Toasts fire via `notify-send` when pi needs you *and* the pane is not visible. Visibility requires all three of: active pane, active tmux window, focused terminal. The terminal check resolves the focused X window to a pid and walks the parent chain of the tmux client's tty, because a terminal is the client's grandparent, not its parent. Detection failure means silent — a missed toast beats a storm of false ones.
- **statusline** — reordered most important to least, left to right. Left: working indicator, permission mode, anything demanding a decision, model, tokens, cache hit rate, cost, context. Right, outermost last: branch, working directory, MCP, duration.
- **statusline** — added cache hit rate; cost rounded to two decimals; context now reads `34%/1.0M` rather than `34% of 1.0M`; the permission mode drops the `perm:` prefix and shortens `read-only` to `ro`, since colour already carries the meaning.
- **statusline** — a narrow terminal now drops the right side entirely instead of truncating the left, so spend figures survive where a directory path does not.

## 2026-08-10 — source-of-truth skill

**Why:** the method this configuration was built with — docs as specification, a request ledger, verification rules — existed only as scattered rules inside this repository. Anyone starting a project had no way to adopt it, and the one question that proved hardest here ("did we do everything?") had no artefact behind it.

- **skills** — added `source-of-truth`, a bootstrap skill for any project. Sets up a Docusaurus site, the three standing pages, `.pi/APPEND_SYSTEM.md`, and a portable `/docs` command. Carries the verification rules as concrete cautions drawn from real failures, including that a more forgiving tool is not a verification.
- **skills** — the skill ships `assets/requirements.md`, an append-only ledger where rows are added when a request arrives rather than when it is finished, and `done` requires named evidence.

## 2026-08-10 — /docs IPv6 fix

**Why:** `/docs` failed with "server did not come up" while the site was in fact running. `docusaurus serve` binds IPv6 loopback; the check connected to `127.0.0.1` only, concluded nothing was running, started a second server that failed because the port was taken, then waited out its timeout. A raw TCP check also could not tell a live server from a socket held by a dead process.

- **docs-command** — server detection now asks over HTTP (`fetch` resolves both address families and proves the site answers) rather than opening a TCP socket. A port that is bound but not serving is reported as such, pointing at `/docs stop`, instead of timing out.
- **testing** — the detection logic moved to `lib/local-server.ts` with four regression tests that stand up real servers on `::1` and `127.0.0.1`, plus a bare TCP listener to prove a held-but-not-serving socket is distinguished from a live one.

## 2026-08-10 — reaching the docs, and showing rather than telling

**Why:** the documentation is the source of truth but there was no way to open it from the editor — an earlier exchange about `/docs` was misread as a question about command design, and the command itself was never built. Separately, "does it work" kept being answered in prose when the honest answer is a pane the user can look at.

- **docs-command** — new page. `/docs` serves the built site on port 3210 and opens Chrome, `/docs <page>` jumps to a page by loose match, `/docs stop` shuts the server down. Entirely local: no model, no billing, works offline. The server is detached so quitting pi does not close the tab.
- **docs-command** — `/demo <thing>` loads the demo skill and has the agent drive the real feature in a tmux pane, capturing the pane to confirm what happened rather than asserting success.
- **skills** — added `demo`, carrying the tmux mechanics (`split-window -P -F`, `send-keys`, `capture-pane`) and the rule that a keystroke is not evidence — the pane contents are.

## 2026-08-10 — tests, and what subagents actually receive

**Why:** the config had grown well past what a single headless smoke test could vouch for, and an audit of what Claude subagents inherit turned up a real defect — they were being handed the parent's tool list, which they cannot call.

- **testing** — rewritten. Three layers: `tests/unit.test.ts` (43 assertions, no dependencies), `tests/e2e.sh` against the real `pi` and `claude` binaries with a `--paid` tier for real turns, and a standing rule to verify anything that renders by capturing the live tmux pane. Pure logic now lives in `lib/` so tests cover shipped code rather than a copy.
- **claude-subagents** — subagents no longer receive pi's tool list or its documentation pointers. They keep the project rules, guidelines and working order, and are told explicitly that any tool or slash command named in that context belongs to the parent and is unavailable to them.

## 2026-08-10 — queue visibility, drafts, guardrails

**Why:** the send countdown lived only in the statusline, which is easy to miss in the moment right after pressing Enter. Separately, prompts worth composing carefully had nowhere to live, and an unattended session had no ceiling on what it could spend.

- **send-hold** — a widget now sits directly above the editor while a message is queued, showing the countdown, a preview, and the commands. `/now` sends immediately (`/force` kept as an alias).
- **drafts** — new page. `/draft` saves the editor for later or retrieves one, offering **edit** (loads into the editor, stays saved, re-saving updates it in place) or **send now**. Stored as plain Markdown, global rather than per-project because a good prompt is worth reusing.
- **guardrails** — new page. `/limit $5` or `/limit 500k` blocks new turns at a cap without destroying anything; `/kill` shuts down now or at a scheduled time. A limit is reversible and the session survives it — a kill is not, which is why they are separate commands.
- **statusline** — added `limit` and `kill` segments; the kill countdown ticks while idle, since that is when an unattended session burns its schedule down unobserved.

## 2026-08-10 — roadmap

**Why:** wanted-but-unbuilt work was being raised in conversation and would otherwise be lost. Recording it against the docs keeps the specification honest about what exists versus what is intended, and stops the next person re-deriving the same feasibility analysis.

- **roadmap** — new page. First entry: remote sessions. Records what already works (`ssh -t tmux attach`, a shared `sessionDir` for resume-only), the three candidate designs, that `--mode rpc` over SSH is the one that delivers it, and that the real blocker is discovery — Pi has no daemon or socket, so any picker needs an explicit host list.

## 2026-08-10 — forwarding, todos, zen

**Why:** work spans several sessions at once, and there was no way to hand something to another one without copying it by hand. Separately, multi-step work had no visible plan, so there was no way to tell how far through the agent was.

- **forwarding** — new page. `<<<<` forwards a prompt to another session via a picker, with `[clipboard]` and `[last]` placeholders; `forward_to_session` makes it work in a sentence. Delivery is through an on-disk inbox because Pi has no inter-process channel. The wrapper around a forwarded message is configurable, scoped global then project, and **blank by default** — a wrapper is a claim about context the receiving model will act on.
- **todo** — new page. `/todo <goal>` has the agent record a plan through tools; several lists can be live at once, each a JSON file scoped to the session. Live widget above the editor, `/progress` for the full picture, and `todo_read` so a compacted session can recover its plan.
- **statusline** — added the working indicator (spinner while a turn runs), the `todo 2/5` segment, and `/zen` to hide the line entirely.

## 2026-08-10 — keep project skills out of global configuration

**Why:** component extraction rules were needed only by the muxbar project; installing them globally would incorrectly impose project-specific development policy on unrelated repositories.

- **skills** — the global skill list remains limited to general Pi configuration capabilities; project-specific component rules live with their project instead.

## 2026-08-10 — send hold

**Why:** interrupting a turn after it starts leaves half-applied work behind. A wrong prompt is almost always spotted within a second or two of pressing Enter, so holding the send briefly prevents the mess rather than unwinding it.

- **send-hold** — new page. Prompts are held 5 seconds before being sent; `/abort` discards a held message, `/force` sends it now. After the window `/abort` falls back to interrupting the running turn. Nothing is billed or recorded until the hold expires.
- **statusline** — added the `hold 3s /abort` countdown segment.

## 2026-08-10 — later

**Why:** questions during setup exposed two gaps. Compaction was configured but invisible, so there was no way to tell a session had silently lost detail; and the command autocomplete showed too few rows to scan.

- **sessions** — added a session-management table covering compact / fork / tree / clone / switch / name / gc, and noted that compactions are counted. Clarified that switching sessions happens in place, in the same process, and does **not** reload the config — `/reload` or a restart does that.
- **stats** — `/stats` now reports how many times the session has compacted.
- **keybindings** — command autocomplete shows 30 rows (`autocompleteMaxVisible`).

## 2026-08-10

**Why:** the default Pi instance was configured from scratch and moved into `kickstart/dotfiles`. These pages are the specification it was built to; nothing here documents pre-existing behaviour.

Initial documentation for the default Pi instance.

- **intro** — the working order: check the docs, update them, then change the code. Documentation outranks the code.
- **install** — `link.sh` symlinks the tracked config into `~/.pi/agent`; `stage-03.sh` runs it on a fresh machine.
- **models** — `Ctrl+P` cycles a scoped list; context is shared across providers, with caching, reasoning blocks, and window size as the things that do not survive a switch. Credentials are per machine and never tracked.
- **claude-as-model** — `claude` and `claude2` registered as selectable models; selecting one makes Claude Code the primary orchestrator for the turn. Distinguished from the `claude` tool.
- **drive** — `/drive` classifies each request before routing it to a model and effort level. Routing is announced and logged. Quota is learned reactively; no provider exposes remaining subscription usage.
- **modes** — permission modes `all` / `ask` / `read-only`, plus runtime path grants that apply without a restart. Plan mode documented alongside.
- **sessions** — switching happens in place; interrupt is `Ctrl+Escape`; double-Escape forks. Session transcripts are the input/output log.
- **notes** — `/notes` logs what you type instead of sending it to a model.
- **keybindings** — the overrides, and why `Escape` was freed.
- **statusline** — one line: cwd, model (colour-coded per model), permission mode, MCP, tokens, cost, context left (colour-coded by how much remains), elapsed, branch.
- **dashboard** — `/dash` overlay showing everything the agent has; owns the `mcp n/m` segment.
- **stats** — `/stats` breaks the session down by model, tool, and subagent.
- **shell-log** — `!` commands are recorded per session; `!!` entries are marked as hidden from the model.
- **housekeeping** — Pi does not garbage-collect sessions; `/gc` reports and prunes.
- **skills** — `grill-me` and `pr-review`.
- **mcp** — figma, linear, fathom, trello, chrome-devtools, all lazy, Linear's writes gated.
- **claude-subagents** — slot pools capped at 4 for `claude` and 2 for `claude2`, with per-slot usage.
- **improve** — `/improve` hands the config to a fresh agent with its own context and a scoped view of its conversation.
- **testing** — extensions as units, the editor headless via `--mode json`, and the config itself.
