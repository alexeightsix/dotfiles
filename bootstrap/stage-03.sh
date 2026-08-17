if [[ $EUID -eq 0 ]]; then
    echo "Running as root"
    exit 1
fi

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

# GHOSTTY
mkdir -p "$HOME/.config/ghostty"
ln -sfn "$DOTFILES/ghostty" "$HOME/.config/ghostty/config"

# LAZYDOCKER
mkdir -p "$HOME/.config/lazydocker" && \
ln -sf "$DOTFILES/lazydocker.yml" "$HOME/.config/lazydocker/config.yml"

## NEOVIM
nvim_source="$DOTFILES/nvim"
nvim_target="$HOME/.config/nvim"
mkdir -p "$HOME/.config"
if [[ -e "$nvim_target" && ! -L "$nvim_target" ]]; then
    nvim_backup="${nvim_target}.backup-$(date +%Y%m%d-%H%M%S)"
    mv "$nvim_target" "$nvim_backup"
    echo "Backed up the previous Neovim config to $nvim_backup"
fi
ln -sfn "$nvim_source" "$nvim_target"

# FLAMESHOT
# Rendered rather than linked: an INI file does not expand $HOME, and flameshot
# rewrites this file itself as you change settings in the GUI.
mkdir -p "$HOME/.config/flameshot" && \
sed "s|\$HOME|$HOME|g" "$DOTFILES/flameshot.ini" > "$HOME/.config/flameshot/flameshot.ini"

# VICINAE
# Rendered for the same reason as flameshot: JSON has no variables.
mkdir -p "$HOME/.config/vicinae" && \
sed "s|\$HOME|$HOME|g" "$DOTFILES/vicinae.json" > "$HOME/.config/vicinae/settings.json"

# I3
find "$HOME/.config/i3" -delete
mkdir -p "$HOME/.config/i3"
ln -sfn "$DOTFILES/i3config" "$HOME/.config/i3/config"

# PI
# Links settings, keybindings, mcp.json, the theme, extensions and skills into
# ~/.pi/agent. Idempotent, and backs up anything it did not put there.
bash "$DOTFILES/pi/link.sh"

# CODING AGENT USAGE (burn)
mkdir -p "$HOME/.local/bin"
ln -sfn "$DOTFILES/pi/pi-launcher" "$HOME/.local/bin/pi"
ln -sfn "$HOME/dev/burn/burn" "$HOME/.local/bin/burn"

sudo npm install -g neovim
sudo chown -R "$(id -un):$(id -gn)" "$HOME"
