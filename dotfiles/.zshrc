for alias_file in "$HOME/kickstart/dotfiles/zsh/alias/"*(N); do
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

# Record a terminal to a GIF with vhs. Prefer the real binary when it is
# installed: a tape can only drive tools the recorder can see, and the vhs
# image ships no git, so anything reading a repository finds nothing there.
if [ -x "$HOME/go/bin/vhs" ]; then
  export PATH="$HOME/go/bin:$PATH"
else
  # Falling back to the image: mount the folder the tape is run from, and
  # write as you rather than as root — an output owned by root is one you
  # cannot overwrite on the next recording.
  alias vhs='docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD:/vhs" ghcr.io/charmbracelet/vhs'
fi


ZSH_TMUX_AUTOSTART=false
ZSH_THEME="dracula"
plugins=(docker-compose colorize fzf tmux)

source $ZSH/oh-my-zsh.sh

eval "$(atuin init zsh --disable-up-arrow)"
eval "$(zoxide init zsh)"

# bun completions
[ -s "/home/alex/.bun/_bun" ] && source "/home/alex/.bun/_bun"

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# opencode
export PATH=/home/alex/.opencode/bin:$PATH
export PATH="$HOME/.npm-global/bin:$PATH"

# pnpm
export PNPM_HOME="/home/alex/.local/share/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME/bin:"*) ;;
  *) export PATH="$PNPM_HOME/bin:$PATH" ;;
esac
# pnpm end

. "$HOME/.atuin/bin/env"

# sbx: let `sbx fzf` cd the current shell (a child process cannot).
sbx() {
  if [ "$1" = "fzf" ]; then
    local d
    d="$(command sbx fzf)" && cd "$d"
  else
    command sbx "$@"
  fi
}

# Pi
export PATH="/home/alex/.local/share/pi-node/node-v22.23.2-linux-x64/bin:$PATH"

export SBX_WORKSPACE_ROOT="/home/alex/dev/spotlight-workspaces"
