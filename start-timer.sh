#!/bin/bash
# Wait for Node server to be online
while ! curl -s http://localhost:3000 > /dev/null; do
    sleep 1
done

# Disable all input devices to permanently hide the hardware Wayland cursor
export WLR_LIBINPUT_NO_DEVICES=1

# Launch Cage and Chromium natively in Wayland
exec cage -s -- chromium --kiosk --noerrdialogs --disable-infobars --enable-features=UseOzonePlatform --ozone-platform=wayland http://localhost:3000/presenter.html