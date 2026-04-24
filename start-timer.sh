#!/bin/bash

# Wait for Node server to be online
while ! curl -s http://localhost:3000 > /dev/null; do
    sleep 1
done

# Disable screen blanking / screensaver
xset -dpms
xset s off
xset s noblank

# Start Openbox window manager in the background
openbox-session &

# Launch Chromium natively in X11
exec chromium --kiosk --noerrdialogs --disable-infobars --check-for-update-interval=31536000 http://localhost:3000/presenter.html
EOF

chmod +x ~/stage-timer/start-timer.sh