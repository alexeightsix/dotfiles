if [[ $(/usr/bin/id -u) -ne 0 ]]; then
    echo "Not running as root"
    exit
fi

dnf install --nogpgcheck --repofrompath 'terra,https://repos.fyralabs.com/terra$releasever' terra-release
dnf copr enable @go-sig/golang-rawhide -y && \
dnf copr enable atim/i3status-rust -y && \
dnf copr enable atim/lazydocker -y && \
dnf copr enable atim/lazygit -y && \
dnf copr enable pgdev/ghostty && \

## Zig 0.15.2
dnf copr enable tofik/zig && \

dnf update

dnf install \
  arandr \
  blueman \
  blueprint-compiler \
  bluez \
  bluez-tools \
  btop \
  btrfs-assistant \
  cmake \
  compat-lua \
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
  gettext \
  gh \
  ghostty \
  gimp \
  git \
  git-delta \
  gnome-tweaks \
  gnome-system-monitor \
  golang \
  golangci-lint \
  gparted \
  gpick \
  gtk4-devel \
  i3status-rust \
  jq \
  lazydocker \
  lazygit \
  libadwaita-devel \
  libvirt \
  luarocks \
  make \
  mariadb \
  ncdu \
  neovim \
  nmap \
  nodejs \
  npm \
  picom \
  piper \
  postgresql \
  python3 \
  qemu \
  rclone \
  ripgrep \
  rsync \
  ruby-devel \
  snapper \
  telnet \
  tmux \
  virt-manager \
  vlc \
  xclip \
  zoxide \
  zsh \
  zig \
  xfce4-power-manager

dnf remove ghostscript plocate

cd /tmp
wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm 
dnf install ./google-chrome-stable_current_x86_64.rpm
rm google-chrome-stable_current_x86_64.rpm
