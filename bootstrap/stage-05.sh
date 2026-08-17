source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

# ZSH
find "$HOME/.oh-my-zsh" -delete
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
find ~/.zshrc -delete
ln -sfn "$DOTFILES/.zshrc" "$HOME/.zshrc"
ln -sfn "$DOTFILES/.gitconfig" "$HOME/.gitconfig"

# DRACULA
find /tmp/dracula -delete
git clone https://github.com/dracula/zsh.git /tmp/dracula
cp /tmp/dracula/dracula.zsh-theme "$HOME/.oh-my-zsh/themes/dracula.zsh-theme"
cp -rf /tmp/dracula/lib/ "$HOME/.oh-my-zsh/themes"

# ZELLIJ
# The tracked configuration preserves the existing Ctrl-b tmux workflow.
#
# Rendered rather than linked: KDL has no variables, and both the config and
# the layouts carry absolute paths — to the rename script and to the status
# plugin. The layouts are rendered alongside it because zellij reads them from
# layout_dir at runtime, where a literal $DOTFILES would never be expanded.
mkdir -p "$HOME/.config/zellij/layouts"
sed "s|\$DOTFILES|$DOTFILES|g" "$DOTFILES/zellij/config.kdl" > "$HOME/.config/zellij/config.kdl"
for layout in "$DOTFILES"/zellij/layouts/*.kdl; do
    sed "s|\$DOTFILES|$DOTFILES|g" "$layout" > "$HOME/.config/zellij/layouts/$(basename "$layout")"
done
zellij --config "$HOME/.config/zellij/config.kdl" setup --check

# ATUIN
bash <(curl --proto '=https' --tlsv1.2 -sSf https://setup.atuin.sh)
mkdir -p "$HOME/.config/atuin"
ln -sfn "$DOTFILES/atuin.toml" "$HOME/.config/atuin/config.toml"
