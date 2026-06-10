alias dnf='sudo snapper -c root create --description before-dnf && sudo dnf'
alias gs='git status'
alias ld='lazydocker'
alias lg='lazygit'
alias ls="eza -la --group-directories-first --color=never"
alias untar="tar -xvzf"
alias vi='nvim --clean'
alias vim='nvim'
alias oc="opencode"
alias cc="claude"
alias pr="gh pr checkout"
alias db='bun index.tsx --username root --password root --host localhost --database spotlight_dev --port 5432 --openrouter_api_key "$OPENROUTER_API_KEY" --theme rose-pine'

# machine-local secrets (API keys, etc.) — NOT tracked in git
[ -f "$HOME/.zsh_secrets" ] && source "$HOME/.zsh_secrets"

# fuzzy-find a file and open it in nvim with cwd set to the git root
ff() {
  local root file
  root=$(git rev-parse --show-toplevel 2>/dev/null) || root=$PWD
  file=$(fd --type f --hidden --exclude .git . "$root" | fzf --query="$1" --select-1 --exit-0) || return
  [ -n "$file" ] && (cd "$root" && nvim "$file")
}

export DISABLE_AUTO_UPDATE=true
export DISABLE_UPDATE_PROMPT=true
export EDITOR='nvim'
export FZF_DEFAULT_OPTS='--color=fg:#f8f8f2,bg:#282a36,hl:#bd93f9 --color=fg+:#f8f8f2,bg+:#44475a,hl+:#bd93f9 --color=info:#ffb86c,prompt:#50fa7b,pointer:#ff79c6 --color=marker:#ff79c6,spinner:#ffb86c,header:#6272a4'
export PATH="$HOME/.local/bin:$PATH"
export ZSH="$HOME/.oh-my-zsh"

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
