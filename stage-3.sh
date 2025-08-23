if [[ $EUID -eq 0 ]]; then
    echo "Running as root"
    exit o2
fi

# ALACRITTY
ln -s /home/alex/kickstart/dotfiles/alacritty.toml /home/alex/.config/alacritty.toml

# LAZYDOCKER
mkdir -p /home/alex/.config/lazydocker && \
touch /home/alex/.config/lazydocker/config.yml && \
ln -s /home/alex/kickstart/dotfiles/lazydocker.yml /home/alex/.config/lazydocker/config.yml && \

## NEOVIM
find /home/alex/.config/nvim -delete
find /home/alex/.local/share/nvim -delete
mkdir -p /home/alex/.config/nvim && \
git clone https://github.com/alexeightsix/nvim-config.git /home/alex/.config/nvim && \
npm install -g neovim
chown -R alex:alex /home/alex

# I3
find /home/alex/.config/i3 -delete
mkdir -p /home/alex/.config/i3
ln -s /home/alex/kickstart/dotfiles/i3config /home/alex/.config/i3/config

## FLATPAKS
flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo && \
flatpak install --user flathub com.discordapp.Discord -y
flatpak install --user flathub com.getpostman.Postman -y
flatpak install --user flathub com.slack.Slack -y
flatpak install --user flathub com.transmissionbt.Transmission -y
flatpak install --user flathub hu.irl.cameractrls -y
flatpak install --user flathub io.beekeeperstudio.Studio -y
flatpak install --user flathub md.obsidian.Obsidian -y
flatpak install --user flathub us.zoom.Zoom -y

sudo ln -s /var/lib/flatpak/exports/bin/com.discordapp.Discord /usr/bin/discord
sudo ln -s /var/lib/flatpak/exports/bin/com.getpostman.Postman /usr/bin/postman 
sudo ln -s /var/lib/flatpak/exports/bin/com.slack.Slack /usr/bin/slack
sudo ln -s /var/lib/flatpak/exports/bin/com.transmissionbt.Transmission /usr/bin/transmission
sudo ln -s /var/lib/flatpak/exports/bin/hu.irl.cameractrls /usr/bin/cameractrls
sudo ln -s /var/lib/flatpak/exports/bin/io.beekeeperstudio.Studio /usr/bin/beekeeper
sudo ln -s /var/lib/flatpak/exports/bin/md.obsidian.Obsidian /usr/bin/obsidian
sudo ln -s /var/lib/flatpak/exports/bin/us.zoom.Zoom /usr/bin/zoom

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
