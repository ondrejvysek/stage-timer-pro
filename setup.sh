#!/bin/bash
# Stage Timer Pro - Automated Install Script

echo "================================================="
echo "  Stage Timer Pro - Automated Deployment"
echo "================================================="

REPO_URL="https://github.com/ondrejvysek/stage-timer-pro.git"
CURRENT_USER=$(whoami)
APP_DIR="$HOME/stage-timer"
USER_UID=$(id -u)

echo -e "\n[1/6] Updating system and installing dependencies..."
sudo apt update
sudo apt install -y git nodejs npm chromium cage network-manager yarn fonts-dejavu fonts-liberation fonts-roboto

echo -e "\n[2/6] Configuring Auto-Fallback Wi-Fi Hotspot..."
sudo nmcli connection delete "StageTimer_Fallback" 2>/dev/null
sudo nmcli connection add type wifi ifname wlan0 con-name "StageTimer_Fallback" autoconnect yes ssid StageTimer_AP
sudo nmcli connection modify "StageTimer_Fallback" 802-11-wireless.mode ap 802-11-wireless.band bg ipv4.method shared
sudo nmcli connection modify "StageTimer_Fallback" wifi-sec.key-mgmt wpa-psk wifi-sec.psk "stageadmin"
sudo nmcli connection modify "StageTimer_Fallback" connection.autoconnect-priority -10

echo -e "\n[3/6] Automating OS Autologin..."
sudo raspi-config nonint do_boot_behaviour B2

echo -e "\n[4/6] Setting up user permissions for Cage (Kiosk)..."
sudo usermod -a -G video,render,input $CURRENT_USER

echo -e "\n[5/6] Downloading latest code from Git..."
if [ -d "$APP_DIR" ]; then
    sudo rm -rf "$APP_DIR"
fi
git clone "$REPO_URL" "$APP_DIR"

cd "$APP_DIR"

echo -e "\n[6/6] Installing Node App Dependencies & Setting Permissions..."
npm install
chmod +x "$APP_DIR/start-timer.sh"

echo -e "\n[7/7] Creating and Enabling Systemd Services..."
sudo tee /etc/systemd/system/stage-timer.service > /dev/null << EOF
[Unit]
Description=Stage Timer Node Server
After=network.target

[Service]
ExecStart=$(which node) $APP_DIR/server.js
WorkingDirectory=$APP_DIR
StandardOutput=inherit
StandardError=inherit
Restart=always
User=$CURRENT_USER

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/stage-kiosk.service > /dev/null << EOF
[Unit]
Description=Stage Timer Presenter Kiosk
Requires=stage-timer.service
After=stage-timer.service

[Service]
Environment="XDG_RUNTIME_DIR=/run/user/$USER_UID"
Environment="WAYLAND_DISPLAY=wayland-0"
ExecStart=$APP_DIR/start-timer.sh
Restart=always
User=$CURRENT_USER

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable stage-timer
sudo systemctl start stage-timer
sudo systemctl enable stage-kiosk
sudo systemctl start stage-kiosk

echo "================================================="
echo "  Setup Complete! "
echo "  Moderator UI: http://$(hostname -I | awk '{print $1}'):3000/"
echo "================================================="
echo "Please reboot the Raspberry Pi to apply all changes."