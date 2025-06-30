if [[ $EUID -eq 0 ]]; then
    echo "Running as root"
    exit o2
fi

## BEEKEEPER STUDIO
cd /tmp
curl -o /etc/yum.repos.d/beekeeper-studio.repo https://rpm.beekeeperstudio.io/beekeeper-studio.repo
sudo rpm --import https://rpm.beekeeperstudio.io/beekeeper.key
sudo dnf install beekeeper-studio

## FLATPAKS
flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo && \
flatpak install flathub com.discordapp.Discord -y
flatpak install flathub com.getpostman.Postman -y
flatpak install flathub com.transmissionbt.Transmission -y
flatpak install flathub hu.irl.cameractrls -y
flatpak install flathub md.obsidian.Obsidian -y

sudo ln -s /var/lib/flatpak/exports/bin/com.discordapp.Discord /usr/bin/discord
sudo ln -s /var/lib/flatpak/exports/bin/com.getpostman.Postman /usr/bin/postman 
sudo ln -s /var/lib/flatpak/exports/bin/com.transmissionbt.Transmission /usr/bin/transmission
sudo ln -s /var/lib/flatpak/exports/bin/hu.irl.cameractrls /usr/bin/cameractrls
sudo ln -s /var/lib/flatpak/exports/bin/md.obsidian.Obsidian /usr/bin/obsidian

# ZSH
sudo dnf install zsh -y
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

# RUST UP
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# ATUIN
bash <(curl --proto '=https' --tlsv1.2 -sSf https://setup.atuin.sh)
ln -s /home/alex/kickstart/dotfiles/atuin.toml /home/alex/.config/atuin/config.toml

# TURN OFF RGB
cargo install fury-renegade-rgb 
sudo groupadd i2c
sudo usermod -aG i2c alex
sudo touch /etc/systemd/system/rgb.service
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
