# Pi — default instance

Global configuration for the [Pi](https://github.com/badlogic/pi-mono) coding agent, symlinked into `~/.pi/agent` by `link.sh`.

**The documentation is the source of truth, not the code.** Full docs live in `docs/` as a Docusaurus site:

```bash
cd docs && npm start
```

## Layout

| Path | Purpose |
| --- | --- |
| `settings.json` | Models, theme, compaction, retry, packages |
| `keybindings.json` | Key overrides (interrupt is `Ctrl+Escape`) |
| `mcp.json` | MCP servers: figma, linear, fathom, trello, chrome-devtools |
| `APPEND_SYSTEM.md` | Docs-first working order, appended to every session |
| `themes/rose-pine.json` | Theme |
| `extensions/` | statusline, permission-modes, improve, plan-mode, external-claude-agent, git-interceptor |
| `skills/` | Configuration-owned `demo`, `pr-review`, and `source-of-truth`; third-party skills are discovered from `~/.agents/skills/` |
| `docs/` | Docusaurus site — the source of truth |
| `link.sh` | Symlinks everything above into `~/.pi/agent` |

## Install

```bash
./link.sh
```

Idempotent. Backs up anything it did not put there as `*.backup-<stamp>`. Run it again after adding a file. `stage-03.sh` in kickstart calls it during a fresh setup.

Credentials (`~/.pi/agent/auth.json`), sessions, and the model catalogue stay in `~/.pi/agent` and are not tracked here.
