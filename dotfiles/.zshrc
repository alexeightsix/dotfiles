alias air="/home/alex/go/bin/air"
alias dnf='sudo snapper -c root create --description before-dnf && sudo dnf'
alias gs='git status'
alias ld='lazydocker'
alias lg='lazygit'
alias vi='nvim --clean'
alias vim='nvim'


export DISABLE_AUTO_UPDATE=true 
export DISABLE_UPDATE_PROMPT=true
export EDITOR='nvim'
export ZSH="$HOME/.oh-my-zsh"

ZSH_TMUX_AUTOSTART=false
ZSH_THEME="dracula"
plugins=(docker-compose colorize fzf tmux zoxide)

source $ZSH/oh-my-zsh.sh

eval "$(atuin init zsh --disable-up-arrow)"
eval "$(zoxide init zsh)"

. "$HOME/.atuin/bin/env"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  

export PATH=$PATH:/home/alex/go/bin
