# Atuin
atuin update

# Update Ghostty
mkdir -p /tmp/ghostty 
git clone https://github.com/mitchellh/ghostty.git /tmp/ghostty
cd /tmp/ghostty
git pull origin main && 
sudo zig build -Doptimize=ReleaseFast 
cp ./zig-out/bin/ghostty $(which ghostty)
rm -rf /tmp/ghostty

# Coding Agents
claude update
opencode upgrade
codex update
pi update
pi update --extensions

# Flatpak
flatpak update -y
