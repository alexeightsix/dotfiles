# Where this checkout lives, worked out from this file's own location rather
# than written down. %x is the file currently being sourced — ~/.zshrc — and :A
# resolves that symlink back to the real file inside the repository, so the
# clone can be named anything and sit anywhere. It is ~/kickstart on the
# desktop and ~/dotfiles inside an Incus instance; neither needs to be spelled
# out here.
: "${DOTFILES:=${${(%):-%x}:A:h}}"
export DOTFILES

# One file per alias, named after it, in zsh/alias/. Aliases are not written
# inline here: a name you cannot grep for by filename is a name you forget you
# defined.
for alias_file in "$DOTFILES/zsh/alias/"*(N); do
  source "$alias_file"
done
unset alias_file

# machine-local secrets (API keys, etc.) — NOT tracked in git
[ -f "$HOME/.zsh_secrets" ] && source "$HOME/.zsh_secrets"

export DISABLE_AUTO_UPDATE=true
export DISABLE_UPDATE_PROMPT=true
export EDITOR='nvim'
export FZF_DEFAULT_OPTS='--color=fg:#f8f8f2,bg:#282a36,hl:#bd93f9 --color=fg+:#f8f8f2,bg+:#44475a,hl+:#bd93f9 --color=info:#ffb86c,prompt:#50fa7b,pointer:#ff79c6 --color=marker:#ff79c6,spinner:#ffb86c,header:#6272a4'
export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/.atuin/bin:$PATH"
export ZSH="$HOME/.oh-my-zsh"

ZSH_TMUX_AUTOSTART=false
ZSH_THEME="dracula"
plugins=(docker-compose colorize fzf tmux)

# Guarded: this same file is cloned into disposable Incus instances, and a
# missing oh-my-zsh should cost you the theme, not the shell.
[ -r "$ZSH/oh-my-zsh.sh" ] && source "$ZSH/oh-my-zsh.sh"

command -v atuin  >/dev/null 2>&1 && eval "$(atuin init zsh --disable-up-arrow)"
command -v zoxide >/dev/null 2>&1 && eval "$(zoxide init zsh)"

# bun completions
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# opencode
export PATH="$HOME/.opencode/bin:$PATH"
export PATH="$HOME/.npm-global/bin:$PATH"

# pnpm
export PNPM_HOME="$HOME/.local/share/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME/bin:"*) ;;
  *) export PATH="$PNPM_HOME/bin:$PATH" ;;
esac
# pnpm end

# Only present when atuin came from its own installer; the distro package puts
# the binary on PATH and ships no env file.
[ -f "$HOME/.atuin/bin/env" ] && . "$HOME/.atuin/bin/env"

# Pi
export PATH="$PATH:$HOME/.local/share/pi-node/node-v22.23.2-linux-x64/bin"

# `!copy` at the prompt -> last line of output on the clipboard. Sourced last:
# it wraps whatever accept-line widget the plugins above left in place.
[ -r "$DOTFILES/zsh/copyline.plugin.zsh" ] && source "$DOTFILES/zsh/copyline.plugin.zsh"

export SBX_WORKSPACE_ROOT="$HOME/dev/spotlight-workspaces"

# Yours, per machine. Never tracked, never overwritten — this is where an
# instance or a second laptop puts what only it needs.
[ -f "$HOME/.zshrc.local" ] && source "$HOME/.zshrc.local"
