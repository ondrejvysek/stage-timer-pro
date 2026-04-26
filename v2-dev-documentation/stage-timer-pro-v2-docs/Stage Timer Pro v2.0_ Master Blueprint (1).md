# **Stage Timer Pro v2.0: Master Blueprint**

## **1\. Project Vision & Philosophy**

Stage Timer Pro v2.0 transitions from a single-room utility into a professional, multi-room broadcast ecosystem.

* **Hardware as Appliance:** The Pi boots directly into the timer. No OS clutter.  
* **Decentralized Mesh:** Any Pi can discover and control any other Pi on the network.  
* **Broadcast Grade:** High-accuracy sync, upstream keying support, and 9-point screen positioning.  
* **Fail-Safe:** Local autonomous execution ensures the show goes on even if the network fails.

## **2\. Detailed Technical Modules**

### **Idea 1: Decentralized Mesh & Local Identity**

* **Functionality:** This feature creates a zero-configuration network where every Stage Timer Pi automatically announces its presence. To be identifiable in a mesh, each Pi maintains a local identity (Room Name/UUID). This ensures that even if IP addresses change via DHCP, the Pi is recognized as "Ballroom A" or "Green Room" by the central controller.  
* **Technical Solution:** \* **Identity Persistence:** Uses a local data/config.json. If missing on first boot, it generates a unique uuid. This uuid is the "Source of Truth" for the room, regardless of its IP.  
  * **Discovery Logic:** Uses the bonjour-service npm package to broadcast \_stagetimer.\_tcp. The "TXT Record" of the broadcast contains the uuid and roomName.  
  * **Mapping:** The Mesh Dashboard scans the network and maps discovered IPs to these unique UUIDs, allowing for a persistent link even after network re-assignments.  
* **Data Stored:** uuid (string), roomName (string), discoveryEnabled (boolean).

### **Idea 2: Autonomous Node Persistence**

* **Functionality:** Live events are high-stakes; if power is pulled mid-session, the system must recover without human intervention. This feature ensures the active speaker, remaining seconds, and queue progress are cached so the system "wakes up" exactly where it left off.  
* **Technical Solution:** \* **The SD Card Challenge:** Writing to a MicroSD card every second (the timer tick) will burn out the hardware quickly.  
  * **Implementation:** Uses a **Debounced Write Strategy**. High-priority events (Start, Pause, Reset, Next) are written to data/state.json immediately using fs.writeFileSync. Incremental "time remaining" updates are debounced and written every 10 seconds. On boot, the server injects this JSON back into memory before the first socket emission.  
* **Data Stored:** timeLeft (int), isRunning (bool), currentIndex (int), mode (str).

### **Idea 3: Leader/Follower Sync (NTP-Style)**

* **Functionality:** Syncs multiple displays (e.g., Stage vs. Green Room) to sub-second accuracy. Standard network requests have "jitter" (latency variance), meaning simple commands like "start" will cause screens to be off by 100-500ms, which looks unprofessional.  
* **Technical Solution:** \* **Target-Based Timing:** Instead of the Leader sending "There are 59 seconds left," it sends a **Target End Unix Timestamp** (e.g., "The timer ends at 1714000000").  
  * **Handshake Logic:** Followers calculate their local clock offset against the Leader's system time using a high-frequency handshake. Each Follower then calculates its own countdown targeting that specific absolute timestamp, neutralizing network latency entirely.  
* **Data Collected:** Leader IP, System Time Offset (ms).

### **Idea 4: Speaker Queue (The Rundown Engine)**

* **Functionality:** Moves the system from a "dumb clock" to a full event-management tool. An operator can pre-load the entire day's schedule. The stage manager simply hits "Next" to progress through the day, with the screen automatically updating names and time limits for each new presenter.  
* **Technical Implementation:** \* **State Machine:** Manages a linear array in data/rundown.json.  
  * **Transitions:** When triggerNext() is called, the engine captures the "Actual" time of the current speaker, increments the index, and resets the timer to the next segment's duration.  
  * **UI:** Requires a drag-and-drop editor in moderator.html to handle last-minute schedule changes.  
* **Data Stored:** JSON array \[{name, duration, mode, notes}, ...\].

### **Idea 5: Broadcast Upstream (CG Mode)**

* **Functionality:** Turns the Pi into a professional "Character Generator" (CG). By setting the background to green or black, video switchers (ATEM/vMix) can "key out" the background, leaving the timer floating on top of live video.  
* **Technical Implementation:** \* **Layering:** The presenter.html wrapper uses a 3x3 CSS Grid overlay.  
  * **Positioning:** Classes (e.g., .pos-br for Bottom Right) use align-self and justify-self to anchor the clock.  
  * **Scaling:** Uses GPU-accelerated transform: scale() to resize the UI without triggering expensive font re-renders, maintaining 60fps even on a Pi 3\.  
* **Data Stored:** keyMode, position (0-8), scale (float), margin (px).

### **Idea 6: Post-Event Analytics (Actuals Log)**

* **Functionality:** Provides "Proof of Performance." It tracks when each speaker started versus when they were scheduled, and exactly how many seconds they went over.  
* **Technical Implementation:** \* **Logging Hook:** Triggered every time the "Next" button is pressed.  
  * **Storage:** Data is appended to a flat logs/actuals.csv. Flat files are preferred over databases here as they are easily exported and cannot be corrupted by power loss in the same way a database can.  
* **Data Stored:** Timestamp, Speaker Name, Planned vs. Actual duration, Delta.

### **Idea 7: Data Utilities (Export/Import/Init)**

* **Functionality:** Allows for rapid deployment and hardware rotation. A TD can build a complex rundown at home, export it, and import it onto the venue's Pis. "Init" allows for a "Factory Reset" between different clients.  
* **Technical Implementation:** \* **Bundling:** The backend collects all JSON files in /data and assembles them into a single blob.  
  * **Reset Logic:** The /api/admin/init endpoint executes a recursive fs.unlink on all data and log files, followed by a process.exit() to trigger a clean service restart.  
* **Data Collected:** The uploaded/downloaded JSON profile.

### **Idea 8: NDI® Network Output**

* **Functionality:** Outputs the HDMI display as a video stream over IP. This removes the need for physical HDMI capture cards in the control room.  
* **Technical Implementation:** \* **FFmpeg Bridge:** Spawns a sidecar process using FFmpeg with the libndi plugin.  
  * **Capture:** It captures the X11 framebuffer (what Chromium is drawing) and encodes it as a high-quality NDI stream.  
  * **Constraint:** This is extremely CPU-intensive; it is recommended only for RPi 4 or 5 models.  
* **Data Stored:** ndiEnabled, ndiSourceName, ndiResolution.

### **Idea 9: Count to Time/Date (Target Mode)**

* **Functionality:** Targets a specific wall-clock time (e.g., "Lunch at 13:00"). Unlike relative timers, this ensures "Hard Out" broadcast slots are hit exactly.  
* **Technical Implementation:** \* **Clock Dependency:** Dependent on **Idea 3** (NTP) for accuracy.  
  * **Math:** The backend stores a targetISO string. On every tick, it calculates the delta between the target and the current system time. It supports crossing "midnight" and multi-day countdowns.  
* **Data Stored:** targetISO (string) in data/state.json.

### **Idea 10: NDI® Network Input (Background Layer)**

* **Functionality:** Subscribe to an external NDI video source (like slides or a camera) and use it as a live background for the timer. Perfect for Confidence Monitors.  
* **Technical Implementation:** \* **Decoding:** A background FFmpeg process decodes the NDI stream to a local MJPEG or WebRTC pipe.  
  * **Layering:** presenter.html renders this via a \<canvas\> layer with z-index: \-1, effectively "compositing" the live video and timer on the Pi itself.  
* **Hardware Requirement:** **RPi 5 exclusively** due to the heavy decoding/compositing load.

### **Idea 11: MIDI Integration (USB & Network RTP MIDI)**

* **Functionality:** Automation via ProPresenter/Proclaim. When a specific slide is reached, the presentation software triggers the timer automatically.  
* **Technical Implementation:** \* **USB:** Uses easymidi for hardware controllers.  
  * **Network:** Uses rtpmidi to create a virtual Apple MIDI session. The Pi appears as a MIDI destination in macOS.  
  * **Mapping:** Incoming MIDI Notes/CCs are mapped to internal API endpoints via a lookup table.  
* **Data Stored:** midiMappings (object mapping Note/CC to API).

### **Idea 12: Tally Output (TSL & Web Tally)**

* **Functionality:** Status indicators (Red/Yellow/Green) for 3rd party hardware.  
* **Technical Implementation:** \* **TSL 3.1/5.0:** The global broadcast standard. The backend sends UDP hex packets to a configured IP (e.g., a Cuebi light).  
  * **Web Tally:** A dedicated /tally.html route that turns a smartphone screen into a high-visibility color block based on timer state.  
* **Data Stored:** tslTargetIP.

## **3\. Repository Structure**

stage-timer-pro/  
├── backend/                \# Node.js Logic  
│   ├── lib/  
│   │   ├── discovery.js    \# mDNS/Bonjour & Local Identity  
│   │   ├── hardware.js     \# System monitoring  
│   │   ├── logger.js       \# Actuals CSV logging  
│   │   ├── ntp-sync.js     \# Time-sync & delta logic  
│   │   ├── ndi-manager.js  \# NDI Output control  
│   │   ├── midi-controller.js \# MIDI Input logic  
│   │   ├── tally-service.js \# TSL UDP logic  
│   │   └── queue-engine.js \# Rundown state machine  
│   └── server.js           \# Express/Socket.io Entry Point  
├── frontend/               \# Browser Assets  
│   ├── dashboard.html      \# Mesh Hub  
│   ├── moderator.html      \# Room Controller  
│   ├── presenter.html      \# HDMI Output (CG & Positioning)  
│   ├── tally.html          \# Web-based Tally Light  
│   └── loading.html        \# Boot-time polling page  
├── companion/              \# Bitfocus Companion Integration  
├── data/                   \# Persistent JSON Storage (Rundowns, Config, State)  
├── logs/                   \# Post-Event Reporting (Actuals CSV)  
├── scripts/                \# setup.sh, start-timer.sh, update.sh  
└── package.json            \# Dependencies

## **4\. Backlog & Roadmap**

1. **P0 (Core):** Mesh Discovery and local config.json identity engine.  
2. **P0 (Stability):** Finalize JSON-based Rundown logic and local state persistence.  
3. **P1 (Broadcast):** Build the CG Positioning UI and Chroma/Luma keying.  
4. **P1 (Automation):** Idea 11 (MIDI Integration) and Idea 9 (Count to Time).  
5. **P2 (Management):** Export/Import for Rundowns.  
6. **P2 (Analytics):** Actuals Logging and NTP Sync.  
7. **P3 (Extra):** NDI® Output implementation.  
8. **P4 (Experimental):** NDI® Input implementation (RPi 5 recommended).