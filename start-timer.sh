#!/bin/bash
# Wait for Node server to be online
while ! curl -s http://localhost:3000 > /dev/null; do
    sleep 1
done

# Aggressively disable all input devices and hardware cursors for Wayland
export WLR_LIBINPUT_NO_DEVICES=1
export WLR_NO_HARDWARE_CURSORS=1
export XCURSOR_SIZE=0
export XCURSOR_THEME=""

# Launch Cage and Chromium natively in Wayland
exec cage -s -- chromium --kiosk --noerrdialogs --disable-infobars --enable-features=UseOzonePlatform --ozone-platform=wayland http://localhost:3000/presenter.html