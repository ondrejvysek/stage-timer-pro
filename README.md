# **Stage Timer Pro**

A robust, professional stage timer system built for live events, running on a Raspberry Pi.

The system features a centralized Node.js backend, a responsive web-based **Moderator UI** for operators, and a fully autonomous Wayland/X11 **Presenter Kiosk** that outputs directly to an HDMI display. It is designed to be highly resilient, featuring offline font fallbacks, a custom Boot Splash Screen, an automatic Wi-Fi Access Point if the primary network drops, and deep integrations for professional environments.

If you like the project, you can support future development:

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/ondrejv)


[See more examples](#examples) 

<img width="1127" height="1005" alt="image" src="https://github.com/user-attachments/assets/639e74db-8169-4792-8475-c3c02b5e43f6" />


## **Hardware Requirements**

* **Raspberry Pi** (Pi 3, Pi 4, or Pi 5 recommended)  
* **MicroSD Card** (8GB or larger)  
* **HDMI Display** (For the Presenter View)

## **Step 1: Flashing the SD Card**

To ensure the automated installation script works flawlessly, the Raspberry Pi must have SSH enabled from the very first boot.

1. Download and install the official [Raspberry Pi Imager](https://www.raspberrypi.com/software/).  
2. **Choose Device:** Select your Raspberry Pi model.  
3. **Choose OS:** Go to *Raspberry Pi OS (Other)* and select **Raspberry Pi OS Lite (64-bit)**. (Do not install the full desktop version; our script uses a lightweight Kiosk manager instead).  
4. **Choose Storage:** Select your MicroSD card.  
5. Click **Next**. When prompted to apply OS customisation settings, click **EDIT SETTINGS**.

### **⚠️ CRITICAL: OS Customisation Settings**

In the customisation menu (the gear icon), you **must** configure the following:

* **Set hostname:** stagetimer (or whatever you prefer, e.g., timer1).  
* **Enable SSH:** Check this box and select **Use password authentication**. *(If you do not do this, you will not be able to install the software).* \* **Set username and password:** Choose a secure username and password (e.g., stageadmin). The automated installer will configure the kiosk to run under whichever user you create here.  
* **Configure wireless LAN:** Enter your local Wi-Fi network credentials so the Pi can download the installation files.  
* **Set locale settings:** Set your local timezone and keyboard layout.

Click **Save**, then click **Yes** to write the OS to the SD card.

## **Step 2: Running the Automated Setup**

Once the SD card is flashed, insert it into the Raspberry Pi, connect your HDMI display, and plug in the power. Wait about 1-2 minutes for the Pi to boot and connect to your Wi-Fi network.

1. Open a terminal on your computer.  
2. SSH into the Raspberry Pi (replace YOUR\_USERNAME with the username you created):  
   ssh YOUR\_USERNAME@stagetimer.local  
3. Once logged in, run the **One-Line Installer**:
```
curl -sSL https://raw.githubusercontent.com/ondrejvysek/stage-timer-pro/refs/heads/main/setup.sh?v=$RANDOM | bash
```
### **What the installer does:**

* Installs Node.js, Chromium, and the X11 display manager.  
* Sets up a custom **Plymouth Boot Splash Screen** so the audience never sees Linux terminal text on boot.  
* Creates an Offline "Waiting" Page while Node.js boots.  
* Configures an automatic Fallback Wi-Fi Hotspot (StageTimer\_AP).  
* Automates console Autologin (required for the display kiosk).  
* Downloads this repository and installs dependencies.  
* Creates and starts the background systemd services so the timer boots automatically forever.

When the script finishes, **reboot the Pi**: sudo reboot

## **Step 3: Configuring the Boot Splash Screen**

The installer hides the standard Raspberry Pi scrolling boot text using a Plymouth script. To add your own company or event logo to the boot screen:

1. Copy a PNG file containing your logo over to the Raspberry Pi.  
2. Overwrite the default splash file located at /usr/share/plymouth/themes/stagetimer/splash.png

## **Step 4: Using the System**

When the Pi turns back on, the HDMI display will show an initialization screen and then automatically launch the **Presenter View** in fullscreen.

### **Moderator Interface (Mobile App PWA)**

To control the timer, open a web browser on any device connected to the same network and navigate to: http://\<RASPBERRY\_PI\_IP\_ADDRESS\>:3000/

**Pro Tip for iPad / iOS / Android users:** The Moderator UI is fully PWA (Progressive Web App) compliant. Simply tap **"Add to Home Screen"** on your tablet/phone. It will save a custom icon to your device, and launching it will open a pristine, full-screen native app experience without browser URL bars getting in the way\!

### **Audio Cues (Chimes)**

If you get easily distracted while producing, you can enable Audio Cues from the Moderator UI. Click the **🔕 AUDIO OFF** button in the header. When the timer hits 0:00, a subtle audio chime will play on your device.

## **Fallback Access Point (No Wi-Fi? No Problem)**

If you take the Stage Timer to a venue with no Wi-Fi, or the local Wi-Fi drops, the Pi will automatically broadcast its own network after a minute:

* **Network Name (SSID):** StageTimer\_AP  
* **Password:** stageadmin

Connect your phone or laptop to this network, and access the Moderator UI at http://10.42.0.1:3000/.

## **System Settings & Management**

The Moderator UI features a hidden **Settings Modal** (Click the Gear Icon in the top right). From here, you can:

* Scan for and connect to new Wi-Fi networks.  
* Set a Static IP address.  
* Manually toggle the Fallback Access Point.  
* Change the Pi's hostname.  
* Upload a custom event logo for the Idle display screen.  
* **Pull Firmware Update (Git):** Instantly downloads the latest code from this repository and restarts the timer service.

## **Elgato Stream Deck / Bitfocus Companion Integration**

### **Bitfocus Companion: Custom Module Setup Guide (Windows)**

If your Companion is running on Windows (not tested on MacOS, approach could be the same)

#### Step 1: Enable developer mode

On the splash screen, click on the gear icon top right
<img width="397" height="488" alt="image" src="https://github.com/user-attachments/assets/3a24922c-ddb6-4a50-bc25-2fb5d2c12c86" />

Enable the developer mode and choose a folder where the developer modules will be stored

<img width="818" height="579" alt="image" src="https://github.com/user-attachments/assets/636996af-6e41-492c-bb96-e9806b36db1e" />

Close Advanced settings window

#### Step 2: Load custom module

Download stage-timer-pro.pkg [https://github.com/ondrejvysek/stage-timer-pro/blob/main/companion/stage-timer/stage-timer-pro.tgz](https://github.com/ondrejvysek/stage-timer-pro/blob/main/companion/stage-timer/stage-timer-pro.tgz)

In the Companion UI, navigate to Modules, select Import module package, then select the downloaded .pkg file.

The custom module should appear in the module list

<img width="1097" height="424" alt="image" src="https://github.com/user-attachments/assets/59cf74bd-e55f-4301-a1a3-5473ee01ff33" />

#### Step 3: Use the module

Navigate to Connections in the Companion, Add the custom module.

<img width="1365" height="435" alt="image" src="https://github.com/user-attachments/assets/c266a70b-ee92-4caf-8d50-f8c427ffccf3" />

In the IP configuration, enter the IP address of your PI (just IP, no ports,...)

### **Bitfocus Companion: Custom Module Setup Guide (Companion Pi)**

This repository includes a pre-built, custom Bitfocus Companion module designed specifically to control the Stage Timer Pro API.

If you are running the official Companion Pi image, the system handles custom developer modules using a pre-configured directory. Because the module is already compiled in this repository, installation takes just a few seconds.

### Step 1: Locate the Developer Folder

On the Companion Pi image, the system automatically looks for custom developer modules in the following directory:
`/opt/companion-module-dev/`

### Step 2: Download & Install the Module

You can download the module and move it to the developer folder in one action. This command downloads the repository to a temporary folder, extracts just the pre-built Companion module, places it in the correct directory, and cleans up the leftover files.

SSH into your Companion Pi and run this block:
```
1. Download the repository to a temporary folder
git clone https://github.com/ondrejvysek/stage-timer-pro.git /tmp/stage-timer-pro

# 2. Create the developer directory and copy the pre-built files
sudo mkdir -p /opt/companion-module-dev/stage-timer-pro
sudo cp -r /tmp/stage-timer-pro/companion/stage-timer/* /opt/companion-module-dev/stage-timer-pro/

# 3. Navigate into the new module folder
cd /opt/companion-module-dev/stage-timer-pro

# 4. Install the required Companion Base module (It's safe to ignore Node version warnings)
sudo npm install @companion-module/base@^1.14.1

# 5. CRITICAL: Fix folder ownership so the Companion background service can read it
sudo chown -R companion:companion /opt/companion-module-dev/stage-timer-pro

# 6. Clean up the temporary files and restart Companion
rm -rf /tmp/stage-timer-pro
sudo systemctl restart companion
```

Your file structure will now correctly look like this:
/opt/companion-module-dev/stage-timer-pro/package.json (along with main.js, manifest.json, and HELP.md).

### Step 3: Restart Companion

You must restart the Companion background service so it can scan the developer folder and recognize the newly added module.

Run the following command: `sudo systemctl restart companion`

### Step 4: Add the Module to Your Setup

1. Open the Bitfocus Companion Web UI in your browser (e.g., http://<COMPANION_PI_IP>:8000).
2. Go to the Connections tab.
3. Under the Add Connection search bar, type Stage Timer Pro.
4. You should see the custom module appear in the list.
5. Click Add.
6. In the configuration panel that appears, enter the IP address of your Stage Timer Pro Raspberry Pi. (If Companion is running on the exact same Pi as the timer, you can simply use 127.0.0.1 or localhost).
7. Click Save.

### Included Presets & Features

Once connected, you can drag and drop pre-configured buttons directly from the Presets tab onto your Stream Deck. The module includes the following categories:

#### 1. Transport Controls & Manual Adjustments

Start / Pause / Toggle: Control the running state of the timer.

+1 Minute / -1 Minute: Adjust the time on the fly without stopping the clock.

#### 2. Display Modes

Instantly switch the HDMI output behavior:

 - Countdown: Standard counting down to zero.
 - Count-Up: Starts at zero and counts upward.
 - Time of Day: Displays the current local time.
 - Idle / Logo: Hides the clock and displays your uploaded custom Event Logo.

#### 3. Quick Times

Reset the timer to specific preset durations instantly:

`1m`, `5m`, `10m`, `15m`, `30m`, and `60m`.

#### 4. Messaging

 - Toggle Message: Shows or hides the currently queued message.
 - Trigger Quick Messages (Slots 0-3): Instantly forces one of your 4 saved Quick Messages to the screen.

#### 🌟 Smart Feedbacks (Dynamic Colors)

The buttons on your Stream Deck are programmed to react to the live state of the Stage Timer:

 - Green: The timer is actively running.
 - Yellow: Warning state (The timer has dropped below 2 minutes).
 - Red / Flashing: Danger state (The timer has reached 0:00).

#### Troubleshooting

Module isn't showing up: Ensure the copy command in Step 2 worked correctly, and that the folder contains manifest.json and main.js. Don't forget to restart the Companion service (sudo systemctl restart companion).

## Examples

### Moderator view

<img width="1127" height="1005" alt="image" src="https://github.com/user-attachments/assets/639e74db-8169-4792-8475-c3c02b5e43f6" />

### Count down

<img width="694" height="450" alt="image" src="https://github.com/user-attachments/assets/42a8d413-6742-491c-8b19-1af1daf1be27" />
<img width="696" height="447" alt="image" src="https://github.com/user-attachments/assets/1fd2af75-3e12-462f-aebe-567aedae5d28" />
<img width="698" height="447" alt="image" src="https://github.com/user-attachments/assets/6cbb392d-47fe-469c-adb8-471440459126" />


### Count down stage message

<img width="698" height="449" alt="image" src="https://github.com/user-attachments/assets/e6ce458b-f8cf-4f09-9481-813e8d4e5277" />

### Count up

<img width="700" height="447" alt="image" src="https://github.com/user-attachments/assets/2627c571-1359-44a1-9607-8df511e07579" />

### Time of day

<img width="694" height="449" alt="image" src="https://github.com/user-attachments/assets/ac2094e1-5261-4347-b4f0-54f8f0757dc1" />

### Logo

<img width="698" height="446" alt="image" src="https://github.com/user-attachments/assets/81015786-472b-40fa-a795-3c1673d617bf" />

### Companion Stream Deck module

<img width="755" height="702" alt="image" src="https://github.com/user-attachments/assets/5bf03473-2082-4e8f-b83c-5cde8dafc2c7" />
