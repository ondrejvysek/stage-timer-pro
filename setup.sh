#!/bin/bash
# Stage Timer Pro - Automated Install Script
# Fetches the latest code from Git and configures the Kiosk Pi

echo "================================================="
echo "  Stage Timer Pro - Automated Deployment"
echo "================================================="

# --- CONFIGURATION ---
REPO_URL="https://github.com/ondrejvysek/stage-timer-pro.git"
APP_DIR="/home/pi/stage-timer"

echo -e "\n[1/7] Updating system and installing dependencies..."
sudo apt update
sudo apt install -y git nodejs npm chromium cage network-manager yarn fonts-dejavu fonts-liberation fonts-roboto

echo -e "\n[2/7] Configuring Auto-Fallback Wi-Fi Hotspot..."
sudo nmcli connection delete "StageTimer_Fallback" 2>/dev/null
sudo nmcli connection add type wifi ifname wlan0 con-name "StageTimer_Fallback" autoconnect yes ssid StageTimer_AP
sudo nmcli connection modify "StageTimer_Fallback" 802-11-wireless.mode ap 802-11-wireless.band bg ipv4.method shared
sudo nmcli connection modify "StageTimer_Fallback" wifi-sec.key-mgmt wpa-psk wifi-sec.psk "stageadmin"
sudo nmcli connection modify "StageTimer_Fallback" connection.autoconnect-priority -10

echo -e "\n[3/7] Automating OS Autologin and Display Rotation..."
# Enable Console Autologin for the 'pi' user (Boot option B2)
sudo raspi-config nonint do_boot_behaviour B2

# Apply 720p and Portrait Rotation to the kernel boot string
CMDLINE_FILE="/boot/firmware/cmdline.txt"
[ ! -f "$CMDLINE_FILE" ] && CMDLINE_FILE="/boot/cmdline.txt"

if ! grep -q "video=HDMI-A-1" "$CMDLINE_FILE"; then
    sudo sed -i '1 s/$/ video=HDMI-A-1:1280x720@60,panel_orientation=right/' "$CMDLINE_FILE"
    echo "Hardware display rotation applied."
else
    echo "Display rotation already configured."
fi

echo -e "\n[4/7] Setting up user permissions for Cage (Kiosk)..."
sudo usermod -a -G video,render,input pi

echo -e "\n[5/7] Downloading latest code from Git..."
if [ -d "$APP_DIR" ]; then
    sudo rm -rf "$APP_DIR"
fi
git clone "$REPO_URL" "$APP_DIR"

cd "$APP_DIR"

echo -e "\n[6/7] Installing Node App Dependencies & Setting Permissions..."
npm install
chmod +x "$APP_DIR/start-timer.sh"

echo -e "\n[7/7] Creating and Enabling Systemd Services..."

# Create the Node.js Server Service
sudo tee /etc/systemd/system/stage-timer.service > /dev/null << EOF
[Unit]
Description=Stage Timer Node Server
After=network.target

[Service]
ExecStart=/usr/bin/node $APP_DIR/server.js
WorkingDirectory=$APP_DIR
StandardOutput=inherit
StandardError=inherit
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
EOF

# Create the Cage Kiosk Service
sudo tee /etc/systemd/system/stage-kiosk.service > /dev/null << EOF
[Unit]
Description=Stage Timer Presenter Kiosk
Requires=stage-timer.service
After=stage-timer.service

[Service]
Environment="XDG_RUNTIME_DIR=/run/user/1000"
Environment="WAYLAND_DISPLAY=wayland-0"
ExecStart=$APP_DIR/start-timer.sh
Restart=always
User=pi

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