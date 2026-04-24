#!/bin/bash
# Stage Timer Pro - Automated Install Script
# Fetches the latest code from Git and configures the Kiosk Pi with X11

echo "================================================="
echo "  Stage Timer Pro - Automated Deployment"
echo "================================================="

# --- CONFIGURATION ---
REPO_URL="https://github.com/ondrejvysek/stage-timer-pro.git"
CURRENT_USER=$(whoami)
APP_DIR="$HOME/stage-timer"

echo -e "\n[1/7] Updating system and installing dependencies..."
sudo apt update
# Pure X11 setup - No Wayland, no Cage, no xdotool needed!
sudo apt install -y git nodejs npm chromium xserver-xorg x11-xserver-utils xinit openbox network-manager fonts-dejavu fonts-liberation fonts-roboto

echo -e "\n[2/7] Configuring Auto-Fallback Wi-Fi Hotspot..."
sudo nmcli connection delete "StageTimer_Fallback" 2>/dev/null
sudo nmcli connection add type wifi ifname wlan0 con-name "StageTimer_Fallback" autoconnect yes ssid StageTimer_AP
sudo nmcli connection modify "StageTimer_Fallback" 802-11-wireless.mode ap 802-11-wireless.band bg ipv4.method shared
sudo nmcli connection modify "StageTimer_Fallback" wifi-sec.key-mgmt wpa-psk wifi-sec.psk "stageadmin"
sudo nmcli connection modify "StageTimer_Fallback" connection.autoconnect-priority -10

echo -e "\n[3/7] Automating OS Autologin..."
# Enable Console Autologin (Boot option B2)
sudo raspi-config nonint do_boot_behaviour B2

echo -e "\n[4/7] Setting up user permissions..."
sudo usermod -a -G video,render,input,tty $CURRENT_USER

echo -e "\n[5/7] Downloading latest code from Git..."
if [ -d "$APP_DIR" ]; then
    sudo rm -rf "$APP_DIR"
fi
git clone "$REPO_URL" "$APP_DIR"

cd "$APP_DIR"

echo -e "\n[6/7] Installing Node App Dependencies..."
npm install
chmod +x "$APP_DIR/start-timer.sh"

echo -e "\n[7/7] Creating Node Service and X11 Autologin..."

# Create the Node.js Server Service dynamically for the logged-in user
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

sudo systemctl daemon-reload
sudo systemctl enable stage-timer
sudo systemctl start stage-timer

# Bind the Kiosk launch to the physical HDMI console autologin using X11
# The -- -nocursor flag natively destroys the hardware cursor pointer
echo '[[ -z $DISPLAY && $XDG_VTNR -eq 1 ]] && exec startx "'$APP_DIR'/start-timer.sh" -- -nocursor' > "$HOME/.bash_profile"

echo "================================================="
echo "  Setup Complete! "
echo "  Moderator UI: http://$(hostname -I | awk '{print $1}'):3000/"
echo "================================================="
echo "Please reboot the Raspberry Pi to apply all changes."