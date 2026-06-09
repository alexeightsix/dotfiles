#!/bin/bash
if [ -d /sys/class/power_supply/BAT0 ]; then
    exec /usr/bin/i3status-rs /home/alex/kickstart/dotfiles/i3status.toml
else
    exec /usr/bin/i3status-rs /home/alex/kickstart/dotfiles/i3status-desktop.toml
fi
