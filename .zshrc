alias gs="git status"
alias ld=lazydocker
alias lg=lazygit
alias vi=nvim
alias vim=nvim
alias gc='git checkout $(git branch -a | fzf )'

export EDITOR='nvim'
export ZSH="$HOME/.oh-my-zsh"
export DISABLE_UPDATE_PROMPT=true
export DISABLE_AUTO_UPDATE=true 

ZSH_TMUX_AUTOSTART=false
ZSH_THEME="dracula"
plugins=(git docker-compose colorize fd fzf tmux zoxide)

source $ZSH/oh-my-zsh.sh
source ~/.openapi_key

eval "$(atuin init zsh --disable-up-arrow)"
eval "$(zoxide init zsh)"

bindkey -s ^f "~/scripts/tmux-sessionizer\n"
