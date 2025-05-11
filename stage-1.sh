if [[ $(/usr/bin/id -u) -ne 0 ]]; then
    echo "Not running as root"
    exit
fi

dnf copr enable @go-sig/golang-rawhide -y && \
dnf copr enable atim/i3status-rust -y && \
dnf copr enable atim/lazydocker -y && \
dnf copr enable atim/lazygit -y && \

dnf update && \
dnf install \
  alacritty \
  arandr \
  blueman \
  bluez \
  bluez-tools \
  btrfs-assistant \
  chromium \
  cmake \
  cronie \
  cronie-anacron \
  dnf-plugins-core \
  fastfetch \
  fd-find \
  feh \
  filezilla \
  firefox \
  flameshot \
  flatpak \
  fzf \
  gimp \
  git \
  git-delta \
  gnome-tweaks \
  golang \
  gparted \
  gpick \
  i3status-rust \
  jq \
  lazydocker \
  lazygit \
  libvirt \
  compat-lua \
  make \
  mariadb \
  ncdu \
  neovim \
  nmap \
  nodejs \
  luarocks \
  postgresql \
  picom \
  python3 \
  qemu \
  ripgrep \
  rofi \
  rsync \
  snapper \
  telnet \
  tmux \
  virt-manager \
  vlc \
  xclip \
  xfce4-power-manager \
  zoxide \
  zsh

which git || exit 1

## SYSTEMD
systemctl enable --now crond.service
systemctl enable --now sshd 

# ALACRITTY, LAZYDOCKER
ln -s /home/alex/kickstart/dotfiles/alacritty.toml /home/alex/.config/alacritty.toml
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

# DISABLE SPEAKER
touch /etc/modprobe.d/nobeep.conf && \
tee /etc/modprobe.d/nobeep.conf << END
blacklist pcspkr
blacklist snd_pcsp
END

# DISABLE FIREWALL
systemctl stop firewalld
systemctl disable firewalld
dnf remove firewalld

# DMENU SOUND ALIAS
ln -s /usr/bin/pavucontrol /usr/bin/sound

# ZOOM
wget https://zoom.us/client/6.4.6.1370/zoom_x86_64.rpm && \
dnf install zoom_x86_64.rpm -y && \
rm zoom_x86_64.rpm && \

# DOCKER
dnf -y install dnf-plugins-core && \
dnf-3 config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo && \
dnf install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin && \
systemctl enable docker && \
systemctl start docker && \
usermod -aG docker alex

# JETBRAINS MONO FONT
mkdir -p /usr/local/share/fonts/jetbrainsmono/
wget -P /tmp/fonts https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/JetBrainsMono.zip && \
unzip /tmp/fonts/JetBrainsMono.zip -d /usr/local/share/fonts/jetbrainsmono/ && \
rm -rf /tmp/fonts/

# PHP
dnf install https://rpms.remirepo.net/fedora/remi-release-42.rpm && \
dnf module enable php:remi-8.4 && \
dnf install php php-cli && \
curl -sS https://getcomposer.org/installer | php && \
mv composer.phar /usr/local/bin/composer && \
chmod +x /usr/local/bin/composer

## SLACK
cd /tmp
wget https://downloads.slack-edge.com/desktop-releases/linux/x64/4.41.105/slack-4.41.105-0.1.el8.x86_64.rpm
dnf install slack-4.41.105-0.1.el8.x86_64.rpm -y
rm -rf /tmp/slack-4.41.105-0.1.el8.x86_64.rpm
