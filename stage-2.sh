if [[ $(/usr/bin/id -u) -ne 0 ]]; then
    echo "Not running as root"
    exit
fi

## SYSTEMD
systemctl enable --now crond.service
systemctl enable --now sshd 

# DISABLE SPEAKER
touch /etc/modprobe.d/nobeep.conf && \
tee /etc/modprobe.d/nobeep.conf << END
blacklist pcspkr
blacklist snd_pcsp
END

# DOCKER
dnf -y install dnf-plugins-core && \
dnf-3 config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo && \
dnf install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin && \
systemctl enable docker && \
systemctl start docker && \
usermod -aG docker alex

# JETBRAINS MONO FONT
mkdir -p /usr/local/share/fonts/jetbrainsmono/
wget -P /tmp/fonts https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/JetBrainsMono.zip && \
unzip /tmp/fonts/JetBrainsMono.zip -d /usr/local/share/fonts/jetbrainsmono/ && \
rm -rf /tmp/fonts/

# PHP
dnf install https://rpms.remirepo.net/fedora/remi-release-42.rpm && \
dnf module enable php:remi-8.4 && \
dnf install php php-cli && \
curl -sS https://getcomposer.org/installer | php && \
mv composer.phar /usr/local/bin/composer && \
chmod +x /usr/local/bin/composer

# DMENU SOUND ALIAS
ln -s /usr/bin/pavucontrol /usr/bin/sound
