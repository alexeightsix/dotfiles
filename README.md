# dev-env

Alex's machine — the packages, the configuration, and the scripts that put both
in place. Nothing hardcodes a username or a clone path: `.zshrc` works out
`$DOTFILES` from its own location (`${(%):-%x}` is the file being sourced, `:A`
resolves the `~/.zshrc` symlink back into the repo) and `installer/common.sh`
does the same for the stages, which install for `$SUDO_USER` rather than root.
So the checkout can be called anything — `~/kickstart` on the desktop,
`~/dotfiles` inside a disposable Incus instance, where the same files run as
`dev`. Formats with no variables of their own (flameshot's INI, vicinae's JSON,
zellij's KDL) are rendered by the installer with `sed` rather than symlinked,
because flameshot rewrites its config as you use it and through a symlink that
lands back in git.

```
installer/   staged setup scripts — run once, in order, on a fresh machine
dotfiles/    the configuration itself; one file per alias under zsh/alias/
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
# the rest are optional extras — rust, nix, fonts, PHP, keyboard rules
```
