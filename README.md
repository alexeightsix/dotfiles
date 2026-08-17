# dev-env

Alex's machine: the packages, the configuration and the scripts that put both
in place — on a desktop, and on a disposable Incus instance.

## TL;DR

```
installer/   staged setup scripts — run once, in order, on a fresh machine
dotfiles/    the configuration itself; everything else links or renders into it
scripts/     things you run afterwards (backups, updates, status bar picker)
wallpapers/  wallpaper-1..5
```

```bash
git clone https://github.com/alexeightsix/dev-env.git ~/kickstart   # any name works
cd ~/kickstart
sudo bash installer/stage-01.sh   # packages
sudo bash installer/stage-02.sh   # services, docker
bash installer/stage-03.sh        # link configs (as you, not root)
bash installer/stage-05.sh        # zsh, oh-my-zsh, zellij, atuin
```

The remaining stages are optional extras — rust, nix, fonts, PHP, keyboard
rules — and can be run in any order.

Day to day: `bash scripts/update-packages.sh` updates everything installed
above; `bash scripts/backup.sh` mirrors the system onto the backup disk.

## No account is baked in

Nothing here hardcodes a username or a clone path — not even the name of the
checkout. Configuration resolves through two variables:

- `$DOTFILES` — the directory holding these files
- `$HOME` — for everything under the account's own home

Neither is written down anywhere. `.zshrc` works out `$DOTFILES` from its own
location: `${(%):-%x}` is the file zsh is sourcing (`~/.zshrc`), and `:A`
resolves that symlink back to the real file in this repository.
`installer/common.sh` does the same for the stages. So the clone can be called
anything and live anywhere — it is `~/kickstart` on the desktop and `~/dotfiles`
inside an Incus instance, and nothing had to be told either name.

The root-run stages install *for* `$SUDO_USER` rather than for root.

Formats without variables — flameshot's INI, vicinae's JSON, zellij's KDL — are
**rendered** by the installer with `sed` rather than symlinked, because there is
no other way to get a real path into them. Everything else is a symlink, so
editing a file in this repo takes effect immediately.

That portability is not academic: the Incus agent-fleet tooling clones this repo
into every disposable dev instance and links it in as `dev`. The shell on a
throwaway box is the same shell as the one on this desktop, and that project's
test suite fails the build if a `/home/alex` reappears in a tracked dotfile.

## Aliases

One file per alias, under [`dotfiles/zsh/alias/`](dotfiles/zsh/alias), named
after the alias. `.zshrc` sources the directory and defines none itself — a name
you cannot find by filename is a name you forget you defined. Files there may
hold a function or a conditional block (see `gc`, `restore`, `vhs`) as well as a
plain `alias`.

## Neovim

The Neovim configuration and its original repository history live under
[`dotfiles/nvim`](dotfiles/nvim). `installer/stage-03.sh` links that directory to
`~/.config/nvim`; an existing directory is moved to a timestamped backup rather
than deleted. Neovim plugins are updated without pulling a separate configuration
repository.

## Zellij

`installer/stage-05.sh` renders
[`dotfiles/zellij/config.kdl`](dotfiles/zellij/config.kdl) into
`~/.config/zellij/config.kdl` and validates it with `zellij setup --check`.

The configuration preserves the tmux-style `Ctrl-b` prefix: split with `"` or
`%`, create a tab with `c`, navigate panes with `h/j/k/l`, and enter a sticky
resize mode with `Ctrl`+arrow or `H/J/K/L`. `Ctrl-b n` opens Zellij's session
manager; `Ctrl-b r` retains the session-or-window rename prompt. Zellij reloads
this configuration when the rendered file changes. Its custom bottom status line
recreates the Rose Pine tmux presentation without exposing Zellij branding, while
retaining the tmux controls.

Tmux remains installed because the tracked Pi configuration uses it for live
terminal verification, and because the Incus instances above run tmux rather
than zellij.
