const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();

// --- CORS FIX FOR LOCAL LOADING SCREEN ---
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// Enable large payload support for Base64 image uploads
app.use(express.json({ limit: '10mb' }));
const server = http.createServer(app);
const io = new Server(server);

// --- IP DETECTION ---
function getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return { ip: iface.address, mask: iface.netmask };
            }
        }
    }
    return { ip: '127.0.0.1', mask: '255.0.0.0' };
}

const netInfo = getNetworkInfo();

// --- PERSISTENCE SETUP ---
const messagesFile = path.join(__dirname, 'messages.json');
const logoFile = path.join(__dirname, 'logo.json');
const webhooksFile = path.join(__dirname, 'webhooks.json');

let quickMessages = ['Wrap Up Now', 'Q&A Starting', '5 Minutes Left', 'Speak Up'];
let logoData = "";
let webhooks = { on_start: "", on_pause: "", on_zero: "", on_logo_enter: "", on_logo_exit: "" };

// Load Messages
try {
    if (fs.existsSync(messagesFile)) {
        quickMessages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
    } else {
        fs.writeFileSync(messagesFile, JSON.stringify(quickMessages));
    }
} catch (e) {
    console.error("Could not load messages.json", e);
}

function saveMessages() {
    try { fs.writeFileSync(messagesFile, JSON.stringify(quickMessages)); } 
    catch (e) { console.error("Could not save messages.json", e); }
}

// Load Logo
try {
    if (fs.existsSync(logoFile)) {
        const parsed = JSON.parse(fs.readFileSync(logoFile, 'utf8'));
        if (parsed && parsed.image) logoData = parsed.image;
    }
} catch (e) {
    console.error("Could not load logo.json", e);
}

// Load Webhooks
try {
    if (fs.existsSync(webhooksFile)) {
        const parsed = JSON.parse(fs.readFileSync(webhooksFile, 'utf8'));
        webhooks = { ...webhooks, ...parsed };
    } else {
        fs.writeFileSync(webhooksFile, JSON.stringify(webhooks));
    }
} catch (e) {
    console.error("Could not load webhooks.json", e);
}

function saveWebhooks() {
    try { fs.writeFileSync(webhooksFile, JSON.stringify(webhooks)); }
    catch (e) { console.error("Could not save webhooks.json", e); }
}

// In-memory only (not persisted): last-fired outcome per event, for the config page to display.
const WEBHOOK_EVENTS = ['on_start', 'on_pause', 'on_zero', 'on_logo_enter', 'on_logo_exit'];
let webhookStatus = {};
WEBHOOK_EVENTS.forEach(e => webhookStatus[e] = { lastFiredAt: null, ok: null, error: null });

// Fire-and-forget GET to a configured webhook URL for a given event.
// Never throws, never blocks the caller, and logs failures instead of retrying,
// so a slow or unreachable external system can never stall the timer.
function fireWebhook(event) {
    const url = webhooks[event];
    if (!url) return;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        fetch(url, { method: 'GET', signal: controller.signal })
            .then(res => {
                webhookStatus[event] = { lastFiredAt: Date.now(), ok: res.ok, error: res.ok ? null : `HTTP ${res.status}` };
            })
            .catch(err => {
                webhookStatus[event] = { lastFiredAt: Date.now(), ok: false, error: err.message };
                console.error(`Webhook [${event}] failed:`, err.message);
            })
            .finally(() => clearTimeout(timeout));
    } catch (e) {
        webhookStatus[event] = { lastFiredAt: Date.now(), ok: false, error: e.message };
        console.error(`Webhook [${event}] error:`, e.message);
    }
}

// --- APP STATE ---
let state = {
    timeLeft: 600,
    initialTime: 600,
    isRunning: false,
    message: "",
    showMessage: false,
    mode: 'countdown', // countdown, countup, timeofday, logo
    ip: netInfo.ip,
    netmask: netInfo.mask,
    logoData: logoData,
    blink_state: false,
    holdAtZero: false,
    autoLogoAtZero: false,
    dissolveDelaySec: 5
};

// Centralizes every mode change so logo enter/exit webhooks fire consistently,
// whether the switch was manual (/api/mode) or automatic (auto-dissolve at zero).
function setMode(newMode) {
    const oldMode = state.mode;
    if (newMode === oldMode) return;
    state.mode = newMode;
    if (newMode === 'logo' && oldMode !== 'logo') fireWebhook('on_logo_enter');
    if (oldMode === 'logo' && newMode !== 'logo') fireWebhook('on_logo_exit');
}

// --- GLOBAL TICK ENGINES ---
let secondsPastZero = null; // null = not currently counting down toward the dissolve

// Standard Timer Tick (1 Second)
setInterval(() => {
    if (state.isRunning) {
        if (state.mode === 'countdown') {
            const wasPositive = state.timeLeft > 0;
            if (state.holdAtZero && state.timeLeft <= 0) {
                state.timeLeft = 0; // clamp: stay at 00:00 instead of going negative
            } else {
                state.timeLeft--;
            }

            if (wasPositive && state.timeLeft <= 0) {
                secondsPastZero = 0; // just crossed the zero boundary, start the delay clock
                fireWebhook('on_zero');
            } else if (secondsPastZero !== null) {
                secondsPastZero++;
            }

            // Dissolve to the logo screen once the configured delay has elapsed
            if (state.autoLogoAtZero && secondsPastZero !== null && secondsPastZero >= state.dissolveDelaySec) {
                setMode('logo');
                secondsPastZero = null;
            }
        }
        else if (state.mode === 'countup') state.timeLeft++;
        broadcast();
    }
}, 1000);

// Flashing Engine for "Time's Up" (500ms)
setInterval(() => {
    if (state.isRunning && state.mode === 'countdown' && state.timeLeft <= 0) {
        state.blink_state = !state.blink_state;
        broadcast();
    } else if (state.blink_state !== false) {
        state.blink_state = false;
        broadcast();
    }
}, 500);

// --- PWA MANIFEST (Mobile App Setup) ---
const svgIcon = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%230f172a'/><text x='50' y='65' font-family='sans-serif' font-size='50' font-weight='bold' fill='%2322c55e' text-anchor='middle'>ST</text></svg>`;

app.get('/manifest.json', (req, res) => {
    res.json({
        "name": "Stage Timer Pro",
        "short_name": "Stage Timer",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#0f172a",
        "theme_color": "#0f172a",
        "icons": [{ "src": "/icon.svg", "sizes": "512x512", "type": "image/svg+xml" }]
    });
});

app.get('/icon.svg', (req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svgIcon.replace('data:image/svg+xml;utf8,', ''));
});

// --- API ENDPOINTS ---
app.get('/api/state', (req, res) => res.json(state));

app.get('/api/start', (req, res) => {
    state.isRunning = true;
    fireWebhook('on_start');
    broadcast();
    res.send('Started');
});

app.get('/api/pause', (req, res) => {
    state.isRunning = false;
    fireWebhook('on_pause');
    broadcast();
    res.send('Paused');
});

app.get('/api/toggle_playback', (req, res) => {
    state.isRunning = !state.isRunning;
    fireWebhook(state.isRunning ? 'on_start' : 'on_pause');
    broadcast();
    res.send(state.isRunning ? 'Started' : 'Paused');
});

app.get('/api/reset', (req, res) => {
    const sec = parseInt(req.query.sec) || state.initialTime;
    state.isRunning = false;
    state.timeLeft = sec;
    state.initialTime = sec;
    secondsPastZero = null;
    broadcast();
    res.send('Reset');
});

app.get('/api/add', (req, res) => {
    state.timeLeft += parseInt(req.query.sec) || 0;
    broadcast();
    res.send('Adjusted');
});

app.get('/api/mode', (req, res) => {
    const validModes = ['countdown', 'countup', 'timeofday', 'logo'];
    if (validModes.includes(req.query.set)) {
        setMode(req.query.set);
        secondsPastZero = null;
        if (state.mode === 'countup') {
            state.timeLeft = 0;
            state.initialTime = 0;
        }
        broadcast();
        res.send('Mode updated');
    } else {
        res.status(400).send('Invalid Mode');
    }
});

app.get('/api/settings/hold_at_zero/toggle', (req, res) => {
    state.holdAtZero = !state.holdAtZero;
    broadcast();
    res.send(state.holdAtZero ? 'Hold at Zero Enabled' : 'Hold at Zero Disabled');
});

app.get('/api/settings/auto_logo_at_zero/toggle', (req, res) => {
    state.autoLogoAtZero = !state.autoLogoAtZero;
    broadcast();
    res.send(state.autoLogoAtZero ? 'Auto Logo at Zero Enabled' : 'Auto Logo at Zero Disabled');
});

app.get('/api/settings/dissolve_delay', (req, res) => {
    const sec = parseInt(req.query.sec);
    if (!isNaN(sec) && sec >= 0 && sec <= 3600) {
        state.dissolveDelaySec = sec;
        broadcast();
        res.send('Dissolve Delay Updated');
    } else {
        res.status(400).send('Invalid Delay (0-3600 seconds)');
    }
});

// --- WEBHOOKS ---
const WEBHOOK_LABELS = {
    on_start: 'Timer Start',
    on_pause: 'Timer Pause',
    on_zero: 'Timer Hits 00:00',
    on_logo_enter: 'Switches To Logo Screen',
    on_logo_exit: 'Switches Away From Logo Screen'
};

// Returns each event's URL, human label, and last-fired outcome, keyed by event name
app.get('/api/webhooks', (req, res) => {
    const combined = {};
    WEBHOOK_EVENTS.forEach(event => {
        combined[event] = {
            label: WEBHOOK_LABELS[event],
            url: webhooks[event] || "",
            ...webhookStatus[event]
        };
    });
    res.json(combined);
});

app.get('/api/webhooks/set', (req, res) => {
    const event = req.query.event;
    const url = req.query.url || "";
    if (!WEBHOOK_EVENTS.includes(event)) {
        return res.status(400).send('Invalid Event');
    }
    if (url && !/^https?:\/\//i.test(url)) {
        return res.status(400).send('URL must start with http:// or https://');
    }
    webhooks[event] = url;
    saveWebhooks();
    res.json({ label: WEBHOOK_LABELS[event], url: webhooks[event], ...webhookStatus[event] });
});

// Fires the configured webhook for one event immediately, for testing from the UI
app.get('/api/webhooks/test', (req, res) => {
    const event = req.query.event;
    if (!WEBHOOK_EVENTS.includes(event)) {
        return res.status(400).send('Invalid Event');
    }
    if (!webhooks[event]) {
        return res.status(400).send('No URL Configured For This Event');
    }
    fireWebhook(event);
    res.send('Test Fired');
});

app.get('/api/message/toggle', (req, res) => {
    state.showMessage = !state.showMessage;
    broadcast();
    res.send(state.showMessage ? 'Message Shown' : 'Message Hidden');
});

app.get('/api/message/set', (req, res) => {
    state.message = req.query.text || "";
    broadcast();
    res.send('Message Set');
});

// INSTANT TRIGGER: Sets the message AND forces it live immediately
app.get('/api/message/trigger', (req, res) => {
    const index = parseInt(req.query.index);
    if (!isNaN(index) && index >= 0 && index < quickMessages.length) {
        state.message = quickMessages[index];
        state.showMessage = true;
        broadcast();
        res.send('Message Triggered Live');
    } else {
        res.status(400).send('Invalid Message Index');
    }
});

// --- LOGO UPLOAD ENDPOINTS ---
app.post('/api/system/logo/upload', (req, res) => {
    if (req.body && req.body.image) {
        state.logoData = req.body.image;
        fs.writeFileSync(logoFile, JSON.stringify({ image: state.logoData }));
        broadcast();
        res.send('Logo Uploaded');
    } else {
        res.status(400).send('No Image Data Received');
    }
});

app.get('/api/system/logo/clear', (req, res) => {
    state.logoData = "";
    if (fs.existsSync(logoFile)) {
        fs.unlinkSync(logoFile);
    }
    broadcast();
    res.send('Logo Cleared');
});

// --- SYSTEM CONTROLS ---
app.get('/api/system/restart', (req, res) => {
    res.send('Restarting System Service...');
    exec('sudo systemctl restart stage-timer', (error, stdout, stderr) => {
        if (error) console.error(`Restart error: ${error}`);
    });
});

app.get('/api/system/update', (req, res) => {
    res.send('Pulling Firmware and System Updates (This may take a few minutes)...');
    const updateCmd = 'git pull && npm install && sudo apt update && sudo apt upgrade -y && sudo systemctl restart stage-timer';
    exec(updateCmd, { cwd: __dirname }, (error) => {
        if (error) console.error(`Update error: ${error}`);
    });
});

app.get('/api/system/hostname', (req, res) => {
    const name = req.query.name;
    if(name) {
        exec(`sudo hostnamectl set-hostname ${name}`);
        res.send('Hostname updated.');
    } else {
        res.status(400).send('Missing name');
    }
});

app.get('/api/system/ap', (req, res) => {
    const action = req.query.action === 'on' ? 'up' : 'down';
    exec(`sudo nmcli con ${action} StageTimer_Fallback`);
    res.send(`AP ${action}`);
});

app.get('/api/system/ap/status', (req, res) => {
    exec('nmcli -t -f NAME con show --active', (error, stdout) => {
        if (error) return res.json({ active: false });
        const isActive = stdout.includes('StageTimer_Fallback');
        res.json({ active: isActive });
    });
});

app.get('/api/system/wifi/scan', (req, res) => {
    exec('sudo nmcli -t -f SSID,SIGNAL dev wifi list', (error, stdout) => {
        if (error) return res.status(500).json([]);
        const networks = [];
        const seen = new Set();
        stdout.split('\n').forEach(line => {
            const [ssid, signal] = line.split(':');
            if (ssid && ssid.trim() !== '' && !seen.has(ssid)) {
                seen.add(ssid);
                networks.push({ ssid, signal });
            }
        });
        res.json(networks);
    });
});

app.get('/api/system/wifi/connect', (req, res) => {
    const { ssid, password } = req.query;
    if (!ssid) return res.status(400).send('SSID required');
    const cmd = password ? `sudo nmcli dev wifi connect "${ssid}" password "${password}"` : `sudo nmcli dev wifi connect "${ssid}"`;
    exec(cmd, (error) => {
        if (error) return res.status(500).send('Connection Failed');
        res.send('Connected!');
    });
});

app.get('/api/system/wifi/static', (req, res) => {
    const { ssid, ip, gateway } = req.query;
    if(ip === 'auto') {
        exec(`sudo nmcli con modify "${ssid}" ipv4.method auto && sudo nmcli con up "${ssid}"`);
    } else {
        exec(`sudo nmcli con modify "${ssid}" ipv4.addresses ${ip} ipv4.gateway ${gateway} ipv4.method manual && sudo nmcli con up "${ssid}"`);
    }
    res.send('IP Configured');
});

// Editable Quick Messages Endpoints
app.get('/api/messages', (req, res) => res.json(quickMessages));

app.get('/api/messages/add', (req, res) => {
    const text = req.query.text;
    if (text && !quickMessages.includes(text)) {
        quickMessages.push(text);
        saveMessages();
        io.emit('messagesUpdate', quickMessages);
    }
    res.send('Added');
});

app.get('/api/messages/remove', (req, res) => {
    const index = parseInt(req.query.index);
    if (!isNaN(index) && index >= 0 && index < quickMessages.length) {
        quickMessages.splice(index, 1);
        saveMessages();
        io.emit('messagesUpdate', quickMessages);
    }
    res.send('Removed');
});

// Used by the Companion Module
app.get('/api/companion', (req, res) => {
    const abs = Math.abs(state.timeLeft);
    const timeStr = (state.timeLeft < 0 ? "-" : "") + 
                    Math.floor(abs/60).toString().padStart(2,'0') + ":" + 
                    (abs%60).toString().padStart(2,'0');
    
    const overTimeStr = state.timeLeft < 0 
                        ? "+" + Math.floor(abs/60).toString().padStart(2,'0') + ":" + (abs%60).toString().padStart(2,'0') 
                        : "";

    res.json({ 
        time: timeStr, 
        running: state.isRunning, 
        msg_active: state.showMessage, 
        raw_seconds: state.timeLeft,
        over_time: overTimeStr,
        mode: state.mode,
        blink_state: state.blink_state,
        messages: quickMessages
    });
});

function broadcast() {
    io.emit('stateUpdate', state);
}

io.on('connection', (socket) => {
    socket.emit('stateUpdate', state);
    socket.emit('messagesUpdate', quickMessages); 
});

app.use(express.static(path.join(__dirname, 'public')));
server.listen(3000, '0.0.0.0', () => console.log('Server running on port 3000'));