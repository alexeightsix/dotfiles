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
