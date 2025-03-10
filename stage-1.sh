dnf copr enable @go-sig/golang-rawhide -y && \
dnf copr enable atim/i3status-rust -y && \
dnf copr enable atim/lazydocker -y && \
dnf copr enable atim/lazygit -y && \
dnf copr enable atim/zoxide  -y && \

dnf install -y https://rpms.remirepo.net/fedora/remi-release-$(cut -d ' ' -f 3 /etc/fedora-release).rpm && \
dnf config-manager -y --set-enabled remi && \


dnf update && \
dnf install \
  alacritty \
  arandr \
  blueman \
  btrfs-assistant \
  cmake \
  cronie \
  chromium \
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
  gnome-tweaks \
  golang \
  gparted \
  gpick \
  i3status-rust \
  jq \
  lazydocker \
  lazygit \
  libvirt \
  lua \
  make \
  mariadb \
  ncdu \
  neovim \
  nmap \
  nodejs \
  ## FIX ME: https://chatgpt.com/c/6754c07f-b8d0-800e-ab4a-69f1be536d83
  ## install PHP using REMI 
  ## php83 \
  ## php83-syspaths \
  #php83 \
  #php83-syspaths \
  luarocks \ 
  postgresql \
  luarocks \
  picom \
  python3 \
  qemu \
  ripgrep \
  rofi \
  rsync \
  snapper \
  telnet \
  tmpwatch \
  tmux \
  virt-manager \
  vlc \
  xclip \
  xfce4-power-manager \
  zoxide \
  zsh -y && \

## FLATPAKS
flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo && \
flatpak install flathub com.discordapp.Discord -y
flatpak install flathub com.github.IsmaelMartinez.teams_for_linux -y
flatpak install flathub com.slack.Slack -y
flatpak install flathub md.obsidian.Obsidian -y
flatpak install flathub com.getpostman.Postman -y
flatpak install flathub com.transmissionbt.Transmission -y
flatpak install flathub hu.irl.cameractrls -y

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

## SYSTEMD
systemctl enable --now crond.service
systemctl enable --now sshd 

## CLEAR TMP
## */5 * * * /usr/sbin/tmpwatch -am 12 /tmp

## NEOVIM
find /home/alex/.config/nvim -delete
find /home/alex/.local/share/nvim -delete
mkdir -p /home/alex/.config/nvim && \
git clone https://github.com/alexeightsix/nvim-config.git /home/alex/.config/nvim && \
npm install -g neovim
chown -R alex:alex /home/alex

# ALACRITTY, LAZYDOCKER
ln -s /home/alex/kickstart/dotfiles/alacritty.toml /home/alex/.config/alacritty.toml
ln -s /home/alex/kickstart/dotfiles/lazydocker.yml /home/alex/.config/lazydocker/config.yml

# I3
find /home/alex/.config/i3 -delete
mkdir -p /home/alex/.config/i3
ln -s /home/alex/kickstart/dotfiles/i3config /home/alex/.config/i3/config

# COMPOSER
curl -sS https://getcomposer.org/installer | php  
mv composer.phar /usr/local/bin/composer
chmod +x /usr/local/bin/composer

# DISABLE SPEAKER
touch /etc/modprobe.d/nobeep.conf && \
tee /etc/modprobe.d/nobeep.conf << END
blacklist pcspkr
blacklist snd_pcsp
END

# ADD FLATPAKS TO DMENU
tee /usr/bin/dmenu_run << END
#!/usr/bin/sh
export PATH=$PATH:/var/lib/flatpak/exports/bin
dmenu_path | dmenu "$@" | ${SHELL:-"/bin/sh"} &
END

# DISABLE FIREWALL
systemctl stop firewalld
systemctl disable firewalld

# REMOVE UNUSED PKGS
dnf remove firewalld

ln -s /usr/bin/pavucontrol /usr/bin/sound

# EXEC
chmod +x /home/alex/kickstart/scripts/backup.sh
chmod +x /home/alex/kickstart/scripts/xrandr.sh

# ALLOW VIA SOFTWARE
chmod a+rw /dev/hidraw3
