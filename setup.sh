#!/bin/bash
# Stage Timer Pro - Automated Install Script
# Fetches the latest code from Git, configures X11, Boot Splash, and Autologin

echo "================================================="
echo "  Stage Timer Pro - Automated Deployment"
echo "================================================="

# --- CONFIGURATION ---
REPO_URL="https://github.com/ondrejvysek/stage-timer-pro.git"
CURRENT_USER=$(whoami)
APP_DIR="$HOME/stage-timer"

echo -e "\n[1/8] Updating system and installing dependencies..."
sudo apt update
sudo apt install -y git nodejs npm chromium xserver-xorg x11-xserver-utils xinit openbox network-manager fonts-dejavu fonts-liberation fonts-roboto plymouth plymouth-themes

echo -e "\n[2/8] Configuring Auto-Fallback Wi-Fi Hotspot..."
sudo nmcli connection delete "StageTimer_Fallback" 2>/dev/null
sudo nmcli connection add type wifi ifname wlan0 con-name "StageTimer_Fallback" autoconnect yes ssid StageTimer_AP
sudo nmcli connection modify "StageTimer_Fallback" 802-11-wireless.mode ap 802-11-wireless.band bg ipv4.method shared
sudo nmcli connection modify "StageTimer_Fallback" wifi-sec.key-mgmt wpa-psk wifi-sec.psk "stageadmin"
sudo nmcli connection modify "StageTimer_Fallback" connection.autoconnect-priority -10

echo -e "\n[3/8] Automating OS Autologin..."
# Enable Console Autologin (Boot option B2)
sudo raspi-config nonint do_boot_behaviour B2

echo -e "\n[4/8] Setting up user permissions..."
sudo usermod -a -G video,render,input,tty $CURRENT_USER

echo -e "\n[5/8] Downloading latest code from Git..."
if [ -d "$APP_DIR" ]; then
    sudo rm -rf "$APP_DIR"
fi
git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

echo -e "\n[6/8] Installing Node App Dependencies..."
npm install
chmod +x "$APP_DIR/start-timer.sh"

echo -e "\n[7/8] Creating Offline Loading Screen..."
# Creates the waiting page that displays while Node.js boots
cat << 'EOF' > "$APP_DIR/loading.html"
<!DOCTYPE html>
<html><head><style>
body { background:#000; color:#22c55e; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; font-size:4vw; font-weight:bold; }
@keyframes pulse { 0%, 100% {opacity:1;} 50% {opacity:0.3;} }
</style><script>
function checkServer() {
    fetch('http://localhost:3000/api/state')
    .then(r => { if(r.ok) window.location.href = 'http://localhost:3000/presenter.html'; })
    .catch(() => setTimeout(checkServer, 1000));
}
setTimeout(checkServer, 1000);
</script></head><body><div style="animation: pulse 2s infinite;">INITIALIZING STAGE TIMER PRO...</div></body></html>
EOF

echo -e "\n[8/8] Setting up Plymouth Boot Splash & Node Service..."
# Create a seamless boot splash
THEME_DIR="/usr/share/plymouth/themes/stagetimer"
sudo mkdir -p "$THEME_DIR"
sudo tee "$THEME_DIR/stagetimer.plymouth" > /dev/null << EOF
[Plymouth Theme]
Name=StageTimer
Description=Stage Timer Pro Custom Splash
ModuleName=script
[script]
ImageDir=$THEME_DIR
ScriptFile=$THEME_DIR/stagetimer.script
EOF

sudo tee "$THEME_DIR/stagetimer.script" > /dev/null << 'EOF'
Window.SetBackgroundTopColor(0.0, 0.0, 0.0);
Window.SetBackgroundBottomColor(0.0, 0.0, 0.0);
EOF
sudo plymouth-set-default-theme -R stagetimer

# Hide Linux boot text
CMDLINE="/boot/firmware/cmdline.txt"
[ ! -f "$CMDLINE" ] && CMDLINE="/boot/cmdline.txt"
sudo cp "$CMDLINE" "${CMDLINE}.bak"
CURRENT_CMD=$(cat "$CMDLINE")
NEW_CMD=$(echo "$CURRENT_CMD" | sed 's/ console=[a-zA-Z0-9,]*//g')
NEW_CMD="$NEW_CMD console=tty3 quiet splash plymouth.ignore-serial-consoles logo.nologo vt.global_cursor_default=0"
sudo bash -c "echo \"$NEW_CMD\" > \"$CMDLINE\""

# Create the Node.js Server Service
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
echo '[[ -z $DISPLAY && $XDG_VTNR -eq 1 ]] && exec startx "'$APP_DIR'/start-timer.sh" -- -nocursor' > "$HOME/.bash_profile"

echo "================================================="
echo "  Setup Complete! "
echo "  Moderator UI: http://$(hostname -I | awk '{print $1}'):3000/"
echo "================================================="
echo "Please reboot the Raspberry Pi to apply all changes."