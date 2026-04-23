#!/bin/bash

# --- CONFIGURATION ---
PROJECT_DIR="$HOME/stage-timer"
LOG_FILE="$HOME/timer_server.log"

cd "$PROJECT_DIR" || exit 1

# Automatically find the correct node path
NODE_EXE=$(which node)

# 1. START NODE SERVER (Only if not running)
if ! pgrep -x "node" > /dev/null; then
    echo "--- Starting Node.js Server at $(date) ---" >> "$LOG_FILE"
    "$NODE_EXE" server.js >> "$LOG_FILE" 2>&1 &
fi

# 2. SERVER CHECK
MAX_RETRIES=30
RETRY_COUNT=0
while ! curl -s http://127.0.0.1:3000 > /dev/null; do
    sleep 1
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then exit 1; fi
done

# 3. LAUNCH KIOSK
# We use the -d flag for Cage and the Ozone/Wayland flags for Chromium
# This forces the browser to native Wayland mode which obeys the hidden cursor
echo "Launching Kiosk on HDMI..." >> "$LOG_FILE"

exec cage -d -- chromium \
    --kiosk \
    --no-sandbox \
    --noerrdialogs \
    --disable-infobars \
    --hide-scrollbars \
    --disable-cursor \
    --sw-cursor \
    --ozone-platform=wayland \
    --touch-events=enabled \
    --disable-features=OverlayScrollbar \
    --autoplay-policy=no-user-gesture-required \
    --check-for-update-interval=31536000 \
    "http://127.0.0.1:3000/presenter.html"