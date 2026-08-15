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
nvim_source=/home/alex/kickstart/dotfiles/nvim
nvim_target=/home/alex/.config/nvim
mkdir -p /home/alex/.config
if [[ -e "$nvim_target" && ! -L "$nvim_target" ]]; then
    nvim_backup="${nvim_target}.backup-$(date +%Y%m%d-%H%M%S)"
    mv "$nvim_target" "$nvim_backup"
    echo "Backed up the previous Neovim config to $nvim_backup"
fi
ln -sfn "$nvim_source" "$nvim_target"

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
