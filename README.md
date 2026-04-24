# **Stage Timer Pro**

A robust, professional stage timer system built for live events, running on a Raspberry Pi.

The system features a centralized Node.js backend, a responsive web-based **Moderator UI** for operators, and a fully autonomous Wayland/X11 **Presenter Kiosk** that outputs directly to an HDMI display. It is designed to be highly resilient, featuring offline font fallbacks, a custom Boot Splash Screen, an automatic Wi-Fi Access Point if the primary network drops, and deep integrations for professional environments.

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

## **Elgato Stream Deck / Bitfocus Companion Integration**

Stage Timer Pro includes a dedicated REST API designed perfectly for **Bitfocus Companion**, allowing Stage Managers to control the clock from tactile, hardware buttons.

1. Open Bitfocus Companion and add a **Generic HTTP Requests** module.  
2. Set the Base URL to: http://\<RASPBERRY\_PI\_IP\_ADDRESS\>:3000  
3. Create buttons using **HTTP GET** requests to the following paths:  
* **Start:** /api/start  
* **Pause:** /api/pause  
* **Toggle Playback:** /api/toggle\_playback  
* **Reset Timer (to existing duration):** /api/reset  
* **Set Preset Time:** /api/reset?sec=300 *(Sets timer to 5 minutes)*  
* **Add/Subtract Time:** /api/add?sec=60 *(Adds 1 minute)*  
* **Trigger Quick Message 1:** /api/message/trigger?index=0

### **Companion Dynamic Feedback**

You can also use Companion's JSON polling to read the current time and display it directly on your Stream Deck buttons\! Poll the /api/companion endpoint to receive:

{  
  "time": "05:00",  
  "running": true,  
  "msg\_active": false,  
  "raw\_seconds": 300,  
  "over\_time": "",  
  "mode": "countdown",  
  "blink\_state": false,  
  "messages": \["Wrap Up Now"\]  
}

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