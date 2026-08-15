# Installation Instructions
``dnf install git``

``cd /home/alex && git clone https://github.com/alexeightsix/dotfiles.git kickstart``

``sudo bash stage-1.sh``

``bash stage-2.sh``

## Neovim

The Neovim configuration and its original repository history live under
[`dotfiles/nvim`](dotfiles/nvim). `stage-03.sh` links that directory to
`~/.config/nvim`; an existing directory is moved to a timestamped backup rather
than deleted. Neovim plugins are updated without pulling a separate configuration
repository.
