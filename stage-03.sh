if [[ $EUID -eq 0 ]]; then
    echo "Running as root"
    exit o2
fi

# GHOSTTY
mkdir -p /home/alex/.config/ghostty
ln -s /home/alex/kickstart/dotfiles/ghostty /home/alex/.config/ghostty/config

# LAZYDOCKER
mkdir -p /home/alex/.config/lazydocker && \
touch /home/alex/.config/lazydocker/config.yml && \
ln -s /home/alex/kickstart/dotfiles/lazydocker.yml /home/alex/.config/lazydocker/config.yml && \

## NEOVIM
find /home/alex/.config/nvim -delete
find /home/alex/.local/share/nvim -delete
mkdir -p /home/alex/.config/nvim && \
git clone https://github.com/alexeightsix/nvim-config.git /home/alex/.config/nvim && \

# I3
find /home/alex/.config/i3 -delete
mkdir -p /home/alex/.config/i3
ln -s /home/alex/kickstart/dotfiles/i3config /home/alex/.config/i3/config

sudo npm install -g neovim
sudo chown -R alex:alex /home/alex
