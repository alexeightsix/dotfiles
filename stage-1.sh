if [[ $(/usr/bin/id -u) -ne 0 ]]; then
    echo "Not running as root"
    exit
fi

dnf install --nogpgcheck --repofrompath 'terra,https://repos.fyralabs.com/terra$releasever' terra-release && \
dnf copr enable @go-sig/golang-rawhide -y && \
dnf copr enable atim/i3status-rust -y && \
dnf copr enable atim/lazydocker -y && \
dnf copr enable atim/lazygit -y && \
dnf copr enable pgdev/ghostty && \

dnf update && \
dnf install \
  arandr \
  blueman \
  bluez \
  bluez-tools \
  btop \
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
  npm \
  luarocks \
  postgresql \
  picom \
  python3 \
  qemu \
  ripgrep \
  rsync \
  ruby-devel \
  snapper \
  telnet \
  tmux \
  piper \
  rclone \
  virt-manager \
  vlc \
  xclip \
  xfce4power-manager \
  zoxide \
  zsh \
  zig \
  gtk4-devel \
  libadwaita-devel \
  blueprint-compiler \
  gettext
