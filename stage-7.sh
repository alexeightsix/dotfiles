# TURN OFF RGB
cargo install fury-renegade-rgb 
sudo groupadd i2c
sudo usermod -aG i2c alex
sudo touch /etc/systemd/system/rgb.service
sudo tee /etc/systemd/system/rgb.service << END
[Unit]
Description=Disable RGB

[Service]
ExecStart=/home/alex/.cargo/bin/fury-renegade-rgb -b /dev/i2c-10 -2 -4 brightness --value 0

[Install]
WantedBy=multi-user.target
END
sudo chmod a+x /home/alex/.cargo/bin/fury-renegade-rgb
systemctl enable rgb.service
