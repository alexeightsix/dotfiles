---
title: Agent usage dashboard
---

# Agent usage dashboard

A local proof of concept collects usage from all four coding-agent accounts and presents one normalized JSON snapshot in a small browser dashboard.

```bash
# Print the current JSON on stdout.
# If no snapshot exists yet, collect it first.
burn
burn --serve          # local dashboard instead of stdout
burn --scrub strict
burn --no-scrub       # explicit full-detail snapshot
burn --refresh        # recollect before printing

# JSON on stdout and at ~/.cache/burn/usage.json
# Identity details are scrubbed by default.
python3 ~/dev/burn/burn.py collect

# Local dashboard; opens http://127.0.0.1:8888
python3 ~/dev/burn/burn.py serve

# Stronger privacy: also remove model/provider history and granular usage.
python3 ~/dev/burn/burn.py collect --scrub strict
python3 ~/dev/burn/burn.py serve --scrub strict

# Explicitly retain identity details. Use only for a private local snapshot.
python3 ~/dev/burn/burn.py collect --no-scrub

# Other useful PoC overrides
python3 ~/dev/burn/burn.py serve --port 7777 --no-open
python3 ~/dev/burn/burn.py collect --output /tmp/usage.json
```

`burn` prints a default-scrubbed snapshot on stdout, and serves the dashboard with `--serve`. Output is piped through `jq` only when stdout is a terminal and `jq` is installed, so redirected and piped output stays byte-identical to the snapshot file. If the existing file predates privacy metadata or has a different privacy mode, `burn` recollects once so it cannot silently reveal a less-private file. Otherwise it does not refresh: pass `--refresh`, press **Refresh** in the dashboard, or run the collector explicitly, when a new snapshot is wanted.

The dashboard uses Alpine.js and Tailwind's browser CDN. There is no frontend build and no application dependency install. It binds to loopback only.

## Service

```bash
~/dev/burn/install.sh              # link ~/.local/bin/burn, install and start burn.service
~/dev/burn/install.sh --port 7777
~/dev/burn/install.sh --uninstall

systemctl --user status burn.service
journalctl --user -u burn.service -f
```

`burn.service` is a systemd **user** unit serving `http://127.0.0.1:8888` with `Restart=on-failure`. It declares its own `PATH`, because the systemd user manager starts with only `/usr/local/bin:/usr/bin` while the collectors shell out to `claude`, `claude2`, `codex` and `opencode`. Linger is off by default, so it runs while the user is logged in; `sudo loginctl enable-linger $USER` changes that.

`burn --serve` probes the port first. A running dashboard is opened rather than duplicated, and a port held by anything else is an error instead of a bind failure, so the service and the command never fight over 8888.

## Refresh means collect

Opening the dashboard without a snapshot, pressing **Refresh**, or letting the page's 60-second timer fire runs all four collectors concurrently, atomically replaces `~/.cache/burn/usage.json`, and renders that new file. Auto-refresh pauses while the tab is hidden and resumes on return; the toggle persists in `localStorage`. A failed collector does not discard the others: its row shows a status dot and its JSON entry carries `partial` or `error`, the reason, and the source's freshness.

Each row is one agent, sorted by name, with its limits, spend and usage. The page deliberately shows no collection method, version, warning text or raw JSON; that detail stays in the snapshot, which `burn` prints.

Refresh sends no model prompt and performs no inference. Codex and OpenCode use read-only interfaces. Opening Claude's built-in usage panel refreshes Claude's own cache and may update normal CLI session metadata; it does not run a model turn. A refresh usually takes several seconds but can approach a minute when a CLI times out.

## Sources

| Agent | Collection path | What is authoritative |
| --- | --- | --- |
| `claude` | Temporary isolated tmux session → built-in `/usage` → `~/.claude.json` | Claude's refreshed subscription windows, reset times, account plan, extra-usage spend if enabled |
| `claude2` | Same, with the wrapper's isolated `CLAUDE_CONFIG_DIR` | The second account's independent windows and plan |
| `codex` | `codex app-server --stdio` JSON-RPC | Account plan, every rate-limit bucket, credits, reset credits, lifetime and daily token usage |
| `opencode` | `opencode db --format json` against OpenCode's own store, plus the configured-provider names in its local auth file | Observed local cost, messages and token totals, including per-model totals |

Temporary tmux sessions are named `burn-*` and are torn down after normal completion, timeout, or collection failure. Existing agent sessions and panes are not read or modified. The collector never accepts a Claude workspace-trust prompt: each account must already trust the probe working directory, or that account returns `partial` with instructions to open it once manually.

## Privacy modes

Every snapshot carries `privacy.mode` and is **identity-scrubbed by default**.

| CLI | Removes |
| --- | --- |
| default or `--scrub identity` | Account email addresses and normalized account/user identifiers |
| `--scrub strict` | Identity details plus per-model rows, configured-provider names, daily usage history, local spend windows, reset-credit detail, source versions and cache diagnostics |
| `--no-scrub` | Nothing from the normalized snapshot; raw credentials and access tokens are never collected in any mode |

The same options apply to `collect` and `serve`. A scrubbed server sanitizes an older full snapshot before serving it. A default `serve` or `burn` never weakens an existing strict snapshot; downgrading privacy requires explicit `--scrub identity` or `--no-scrub`, and recollects because removed fields cannot be recovered from the scrubbed file.

Scrubbing preserves the dashboard's purpose: agent status, plan name, total spend, summary usage, remaining percentages and reset times remain visible. Errors and warnings remain because they explain missing data, but collectors must not place credentials in them.

## What “spend” and “remaining” mean

The JSON does not add unlike numbers together.

- Claude and Codex subscriptions expose **used and remaining percentages**, not a dollar bill. Claude dollar fields appear only when usage credits are enabled.
- Codex credit balance is kept separate from subscription utilization.
- OpenCode's message `cost` is an exact aggregation of the costs recorded in its local database. It is observed client-side cost, not necessarily an invoice.
- OpenCode Go's live remaining allowance is `null` until an authenticated, read-only Console usage source is available. The provider API key can call models but is not accepted by the Console usage endpoint. The collector does not infer a balance from local history because another machine may have used the same account.

Every limit has its own window and reset. There is deliberately no single cross-provider “percent left”.

## JSON contract

The top level is stable enough for the dashboard, but this remains a proof of concept:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-08-10T06:00:00Z",
  "durationMs": 4200,
  "privacy": { "mode": "identity", "scrubbed": true },
  "agents": [
    {
      "id": "claude",
      "status": "ok",
      "account": { "authenticated": true, "plan": "max" },
      "limits": [
        {
          "name": "session",
          "usedPercent": 7,
          "remainingPercent": 93,
          "resetsAt": "2026-08-10T09:59:59Z"
        }
      ],
      "spend": { "amountUsd": null, "basis": "subscription" },
      "usage": {},
      "source": {},
      "warnings": [],
      "errors": []
    }
  ]
}
```

Unknown values are `null`, never zero. `ok` means all intended sources answered, `partial` means useful data was collected with a missing source, and `error` means that agent yielded no useful usage data.

The generated file is user-private operational data even when scrubbed: it contains spend and usage history, and `--no-scrub` also retains account email addresses. It stays under `~/.cache` and is never written into the repository. The local server rejects foreign `Host`, `Origin`, and cross-site refresh requests so another website cannot read the snapshot or trigger collectors through loopback.

The requested minimal frontend loads Alpine.js and Tailwind from their public CDNs. That keeps the proof of concept build-free, but those scripts execute in the page that holds the private snapshot and the dashboard needs network access on first load. A production version should pin and serve reviewed copies locally.
