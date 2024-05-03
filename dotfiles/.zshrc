alias ctray="pkill volumeicon && pkill blueman && pkill nm-applet"
alias dnf="sudo snapper -c root create --description before-dnf && sudo dnf"
alias gc='git checkout $(git branch -a | fzf )'
alias gs="git status"
alias ld=lazydocker
alias lg=lazygit
alias vi=nvim --clean
alias vim=nvim
alias lw='lazyworktree'
alias rs="docker compose down && docker compose up"

export DISABLE_AUTO_UPDATE=true 
export DISABLE_UPDATE_PROMPT=true
export EDITOR='nvim'
export ZSH="$HOME/.oh-my-zsh"

ZSH_TMUX_AUTOSTART=false
ZSH_THEME="dracula"
plugins=(git docker-compose colorize fd fzf tmux zoxide)

source $ZSH/oh-my-zsh.sh

eval "$(atuin init zsh --disable-up-arrow)"
eval "$(zoxide init zsh)"
