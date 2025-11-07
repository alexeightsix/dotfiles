# ZSH
find /home/alex/.oh-my-zsh -delete
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
find ~/.zshrc -delete
ln -s /home/alex/kickstart/dotfiles/.zshrc /home/alex/.zshrc
ln -s /home/alex/kickstart/dotfiles/.gitconfig /home/alex/.gitconfig

# DRACULA
find /tmp/dracula -delete
git clone https://github.com/dracula/zsh.git /tmp/dracula
cp /tmp/dracula/dracula.zsh-theme /home/alex/.oh-my-zsh/themes/dracula.zsh-theme
cp -rf /tmp/dracula/lib/ /home/alex/.oh-my-zsh/themes

# TMUX
# PRESS PREFIX + I 
# TO FETCH PLUGINS
find ~/.tmux/plugins -delete
ln -s /home/alex/kickstart/dotfiles/tmux.conf /home/alex/.tmux.conf
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
tmux && tmux source-file /home/alex/.tmux.conf

# ATUIN
bash <(curl --proto '=https' --tlsv1.2 -sSf https://setup.atuin.sh)
ln -s /home/alex/kickstart/dotfiles/atuin.toml /home/alex/.config/atuin/config.toml
