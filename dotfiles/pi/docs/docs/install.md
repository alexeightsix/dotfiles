---
sidebar_position: 2
title: Install
---

# Install

## On a machine that already has kickstart

```bash
bash ~/kickstart/dotfiles/pi/link.sh
```

`link.sh` is idempotent. Anything already pointing at this repository is left alone; anything else is preserved as a timestamped `*.backup-<stamp>` before the symlink replaces it. Re-run it after adding a file to `extensions/`, `skills/`, or `themes/`.

It links into `$PI_CODING_AGENT_DIR`, or `~/.pi/agent` when that is unset.

## From scratch

```bash
dnf install git
cd /home/alex && git clone https://github.com/alexeightsix/dotfiles.git kickstart
sudo bash stage-01.sh
bash stage-02.sh
# ...
bash stage-03.sh   # links pi, the `burn` command, and the other editor configs
```

Pi itself is installed separately (`pi` on `PATH`); `link.sh` only places configuration. The agent-usage tool, `burn`, lives outside this repository in `~/dev/burn` (published at github.com/alexeightsix/burn); `stage-03.sh` links `~/dev/burn/burn` into `~/.local/bin/burn`, which is already on the configured shell `PATH`. Run `~/dev/burn/install.sh` to also enable its systemd user service.

## Packages

`settings.json` declares npm packages that Pi installs into `~/.pi/agent/npm`:

| Package | Why |
| --- | --- |
| `pi-vim` | Vim keybindings in the editor |
| `pi-mcp-adapter` | One proxy tool for all MCP servers instead of hundreds of tool definitions — see [MCP](./mcp.md) |

Install a new one with `pi install npm:<name>`; it writes through the `settings.json` symlink into this repository, so the change is tracked automatically.

## Verifying

```bash
pi -p --no-session --thinking off -nt "Reply with exactly: ok"
```

A clean `ok` means the config parsed, the extensions loaded, and the default provider is authenticated. Extension load failures print to stderr before the first token.
