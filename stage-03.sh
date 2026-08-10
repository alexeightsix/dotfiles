if [[ $EUID -eq 0 ]]; then
    echo "Running as root"
    exit 1 
fi

# GHOSTTY
mkdir -p /home/alex/.config/ghostty
ln -s /home/alex/kickstart/dotfiles/ghostty /home/alex/.config/ghostty/config

# LAZYDOCKER
mkdir -p /home/alex/.config/lazydocker && \
ln -sf /home/alex/kickstart/dotfiles/lazydocker.yml /home/alex/.config/lazydocker/config.yml

## NEOVIM
find /home/alex/.config/nvim -delete
find /home/alex/.local/share/nvim -delete
mkdir -p /home/alex/.config/nvim && \
git clone https://github.com/alexeightsix/nvim-config.git /home/alex/.config/nvim && \

# FLAMESHOT
mkdir -p /home/alex/.config/flameshot && \
ln -sf /home/alex/kickstart/dotfiles/flameshot.ini /home/alex/.config/flameshot/flameshot.ini

# VICINAE
mkdir -p /home/alex/.config/vicinae && \
ln -sf /home/alex/kickstart/dotfiles/vicinae.json /home/alex/.config/vicinae/settings.json

# I3
find /home/alex/.config/i3 -delete
mkdir -p /home/alex/.config/i3
ln -s /home/alex/kickstart/dotfiles/i3config /home/alex/.config/i3/config

# PI
# Links settings, keybindings, mcp.json, the theme, extensions and skills into
# ~/.pi/agent. Idempotent, and backs up anything it did not put there.
bash /home/alex/kickstart/dotfiles/pi/link.sh

# CODING AGENT USAGE (burn)
mkdir -p /home/alex/.local/bin
ln -sfn /home/alex/dev/burn/burn /home/alex/.local/bin/burn

sudo npm install -g neovim
sudo chown -R alex:alex /home/alex
