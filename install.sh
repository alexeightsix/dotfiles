dnf copr enable @go-sig/golang-rawhide -y
dnf copr enable atim/i3status-rust -y
dnf copr enable atim/zoxide  -y

dnf update && \
dnf upgrade -y && \
dnf install \
  alacritty \
  chromium \
  cmake \
  cronie \
  cronie-anacron \
  dnf-plugins-core \
  fd-find \
  feh \
  filezilla \
  firefox \
  flameshot \
  flatpak \
  fzf \
  btrfs-assistant \
  gimp \
  git \
  golang \
  gparted \
  gpick \
  picom \
  i3status-rust \
  jq \
  lua \
  make \
  ncdu \
  neofetch \
  neovim-0.9.5-2.fc39 \
  snapper \
  nmap \
  nodejs \
  python3 \
  ripgrep \
  rofi \
  rsync \
  tmux \
  vlc \
  zoxide \
  zsh  -y && \

## FONTS
dnf copr enable maveonair/jetbrains-mono-nerd-fonts -y && \
dnf install jetbrains-mono-nerd-fonts jetbrains-mononl-nerd-fonts -y

## FLATPAKS
flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flathub install flathub com.github.IsmaelMartinez.teams_for_linux -y
flatpak install flathub com.discordapp.Discord -y
flatpak install flathub com.slack.Slack -y
flatpak install flathub com.spotify.Client -y
flatpak install flathub org.telegram.desktop -y

## ZOOM
wget https://zoom.us/client/5.17.11.3835/zoom_x86_64.rpm && \
dnf install zoom_x86_64.rpm -y
rm zoom_x86_64.rpm

## DOCKER
dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo -y && \
dnf install docker-ce \
  containerd.io \
  docker-buildx-plugin \
  docker-ce-cli \
  docker-compose-plugin -y && \
systemctl enable docker && \
systemctl start docker && \
usermod -aG docker alex

## CRON
systemctl enable crond.service
systemctl start crond.service

## SSH
systemctl enable sshd 
systemctl start sshd 

## NEOVIM
find /home/alex/.config/nvim -delete
find /home/alex/.local/share/nvim -delete
mkdir -p /home/alex/.config/nvim && \
git clone https://github.com/alexeightsix/nvim-config.git /home/alex/.config/nvim && \
npm install -g neovim
chown -R alex:alex /home/alex

# ALACRITTY
ln -s /home/alex/kickstart/dotfiles/alacritty.toml /home/alex/.config/alacritty.toml

# I3
find /home/alex/.config/i3 -delete
mkdir -p /home/alex/.config/i3
ln -s /home/alex/kickstart/dotfiles/i3config /home/alex/.config/i3/config

dnf remove volumeicon -y
