alias dnf='sudo snapper -c root create --description before-dnf && sudo dnf'
alias gs='git status'
alias ld='lazydocker'
alias lg='lazygit'
alias vi='nvim --clean'
alias vim='nvim'
alias untar="tar -xvzf"

export DISABLE_AUTO_UPDATE=true 
export DISABLE_UPDATE_PROMPT=true
export EDITOR='nvim'
export ZSH="$HOME/.oh-my-zsh"

ZSH_TMUX_AUTOSTART=false
ZSH_THEME="dracula"
plugins=(docker-compose colorize fzf tmux)

source $ZSH/oh-my-zsh.sh

eval "$(atuin init zsh --disable-up-arrow)"

. "$HOME/.atuin/bin/env"

eval "$(zoxide init zsh)"
