#!/bin/bash
# (No blocking loop)

# Disable screen blanking / screensaver
xset -dpms
xset s off
xset s noblank

# Start Openbox window manager in the background
openbox-session &

# Launch Chromium natively in X11 immediately to the loading page.
# The loading page handles the polling/redirecting to Node.js!
exec chromium --kiosk --noerrdialogs --disable-infobars --check-for-update-interval=31536000 "file://$HOME/stage-timer/loading.html"