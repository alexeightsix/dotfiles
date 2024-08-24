# ZSH
find /home/alex/.oh-my-zsh -delete
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
find ~/.zshrc -delete
ln -s /home/alex/kickstart/dotfiles/.zshrc /home/alex/.zshrc

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

# RUST UP
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# ATUIN
bash <(curl --proto '=https' --tlsv1.2 -sSf https://setup.atuin.sh)
ln -s /home/alex/kickstart/dotfiles/atuin.toml /home/alex/.config/atuin/config.toml

# TURN OFF RGB
cargo install fury-renegade-rgb 
sudo groupadd -q i2c
sudo usermod -a -G i2c alex
sudo tee /etc/systemd/system/rgb.service << END
[Unit]
Description=Disable RGB

[Service]
ExecStart=/home/alex/.cargo/bin/fury-renegade-rgb -b /dev/i2c-7 -2 -4 brightness --value 0

[Install]
WantedBy=multi-user.target
END
sudo chmod a+x /home/alex/.cargo/bin/fury-renegade-rgb
systemctl enable rgb.service

# JB Mono
wget -P /tmp/fonts https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/JetBrainsMono.zip && \
unzip /tmp/fonts/JetBrainsMono.zip -d /.local/share/fonts/jetbrainsmono/ && \
rm -rf /tmp/fonts/
