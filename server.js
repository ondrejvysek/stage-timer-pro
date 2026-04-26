const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');

const timerEngine = require('./backend/lib/timer-engine');
const stateStore = require('./backend/lib/state-store');
const apiAuth = require('./backend/lib/api-auth');

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

// --- PERSISTENCE SETUP (v2) ---
let quickMessages = stateStore.load('messages', ['Wrap Up Now', 'Q&A Starting', '5 Minutes Left', 'Speak Up']);
function saveMessages() {
    stateStore.atomicWrite('messages', quickMessages);
}

let logoData = "";
const logoFile = stateStore.load('logo', { image: "" });
if (logoFile && logoFile.image) {
    logoData = logoFile.image;
}

// --- GLOBAL TICK ENGINES (v2 mapped to v1 format for legacy frontend) ---
let blink_state = false;

// We only use setInterval to drive the broadcast to legacy clients.
// The actual timing is absolute timestamp based in timerEngine.
setInterval(() => {
    broadcast();
}, 1000);

// Flashing Engine for "Time's Up" (500ms)
setInterval(() => {
    const ds = timerEngine.getDisplayState();
    if (ds.status === 'running' && ds.mode === 'countdown' && ds.isNegative) {
        blink_state = !blink_state;
        broadcast();
    } else if (blink_state !== false) {
        blink_state = false;
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

// V2 Setup / Pairing
app.post('/api/auth/pair', express.json(), (req, res) => {
    if (!apiAuth.pairingCode) {
        return res.status(403).json({ ok: false, error: { code: 'ALREADY_PAIRED', message: 'System is already paired' } });
    }
    if (req.body.code === apiAuth.pairingCode && req.body.newToken) {
        apiAuth.setToken(req.body.newToken);
        res.json({ ok: true, data: { message: 'Token set successfully' } });
    } else {
        res.status(401).json({ ok: false, error: { code: 'INVALID_CODE', message: 'Invalid pairing code' } });
    }
});

// V1 Compat (Read)
app.get('/api/state', (req, res) => res.json(timerEngine.getV1State(netInfo, logoData, blink_state)));

// V2 Canonical Read
app.get('/api/v2/state', (req, res) => res.json({ ok: true, data: timerEngine.state }));

// --- V1 Compat Routes (Legacy GET for Companion, with admin auth) ---
const compatAuth = apiAuth.requireAdmin();

app.get('/api/start', compatAuth, (req, res) => {
    timerEngine.start();
    broadcast();
    res.send('Started');
});

app.get('/api/pause', compatAuth, (req, res) => {
    timerEngine.pause();
    broadcast();
    res.send('Paused');
});

app.get('/api/toggle_playback', compatAuth, (req, res) => {
    if (timerEngine.state.timer.status === 'running') {
        timerEngine.pause();
    } else {
        timerEngine.start();
    }
    broadcast();
    res.send(timerEngine.state.timer.status === 'running' ? 'Started' : 'Paused');
});

app.get('/api/reset', compatAuth, (req, res) => {
    const sec = parseInt(req.query.sec);
    timerEngine.reset(isNaN(sec) ? null : sec);
    broadcast();
    res.send('Reset');
});

app.get('/api/add', compatAuth, (req, res) => {
    timerEngine.adjustTime(parseInt(req.query.sec) || 0);
    broadcast();
    res.send('Adjusted');
});

app.get('/api/mode', compatAuth, (req, res) => {
    const validModes = ['countdown', 'countup', 'timeofday', 'logo'];
    if (validModes.includes(req.query.set)) {
        timerEngine.setMode(req.query.set);
        broadcast();
        res.send('Mode updated');
    } else {
        res.status(400).send('Invalid Mode');
    }
});

app.get('/api/message/toggle', compatAuth, (req, res) => {
    timerEngine.toggleMessage();
    broadcast();
    res.send(timerEngine.state.timer.messageVisible ? 'Message Shown' : 'Message Hidden');
});

app.get('/api/message/set', compatAuth, (req, res) => {
    timerEngine.setMessage(req.query.text || "", timerEngine.state.timer.messageVisible);
    broadcast();
    res.send('Message Set');
});

// INSTANT TRIGGER: Sets the message AND forces it live immediately
app.get('/api/message/trigger', compatAuth, (req, res) => {
    const index = parseInt(req.query.index);
    if (!isNaN(index) && index >= 0 && index < quickMessages.length) {
        timerEngine.setMessage(quickMessages[index], true);
        broadcast();
        res.send('Message Triggered Live');
    } else {
        res.status(400).send('Invalid Message Index');
    }
});

// --- V2 Timer Routes (POST, JSON, Auth) ---
app.post('/api/timer/start', compatAuth, express.json(), (req, res) => {
    let duration = null;
    if (req.body && typeof req.body.durationSeconds === 'number') {
        duration = req.body.durationSeconds;
    }
    timerEngine.start(duration);
    broadcast();
    res.json({ ok: true, data: {} });
});

app.post('/api/timer/pause', compatAuth, (req, res) => {
    timerEngine.pause();
    broadcast();
    res.json({ ok: true, data: {} });
});

app.post('/api/timer/reset', compatAuth, express.json(), (req, res) => {
    let duration = null;
    if (req.body && typeof req.body.durationSeconds === 'number') {
        duration = req.body.durationSeconds;
    }
    timerEngine.reset(duration);
    broadcast();
    res.json({ ok: true, data: {} });
});

app.post('/api/timer/mode', compatAuth, express.json(), (req, res) => {
    if (req.body && req.body.mode) {
        if (timerEngine.setMode(req.body.mode)) {
            broadcast();
            return res.json({ ok: true, data: {} });
        }
    }
    res.status(400).json({ ok: false, error: { code: 'INVALID_PAYLOAD', message: 'Unknown timer mode' } });
});

app.post('/api/timer/adjust', compatAuth, express.json(), (req, res) => {
    if (req.body && typeof req.body.deltaSeconds === 'number') {
        timerEngine.adjustTime(req.body.deltaSeconds);
        broadcast();
        return res.json({ ok: true, data: {} });
    }
    res.status(400).json({ ok: false, error: { code: 'INVALID_PAYLOAD', message: 'deltaSeconds must be a number' } });
});

app.post('/api/messages/current', compatAuth, express.json(), (req, res) => {
    if (req.body && typeof req.body.message === 'string') {
        const visible = req.body.visible === true;
        timerEngine.setMessage(req.body.message, visible);
        broadcast();
        return res.json({ ok: true, data: {} });
    }
    res.status(400).json({ ok: false, error: { code: 'INVALID_PAYLOAD', message: 'Invalid message payload' } });
});

app.post('/api/messages/quick', compatAuth, express.json(), (req, res) => {
    if (req.body && Array.isArray(req.body.messages)) {
        quickMessages = req.body.messages;
        saveMessages();
        io.emit('messagesUpdate', quickMessages);
        return res.json({ ok: true, data: {} });
    }
    res.status(400).json({ ok: false, error: { code: 'INVALID_PAYLOAD', message: 'messages must be an array' } });
});


// --- LOGO UPLOAD ENDPOINTS ---
app.post('/api/system/logo/upload', compatAuth, (req, res) => {
    if (req.body && req.body.image) {
        logoData = req.body.image;
        stateStore.atomicWrite('logo', { image: logoData });
        broadcast();
        res.send('Logo Uploaded');
    } else {
        res.status(400).send('No Image Data Received');
    }
});

app.post('/api/system/logo/clear', compatAuth, (req, res) => {
    logoData = "";
    stateStore.atomicWrite('logo', { image: "" });
    broadcast();
    res.send('Logo Cleared');
});

// --- SYSTEM CONTROLS (V2 Refactored for Safety) ---
app.post('/api/system/restart-service', compatAuth, (req, res) => {
    res.json({ ok: true, data: { message: 'Restarting System Service...' } });
    spawn('sudo', ['systemctl', 'restart', 'stage-timer']);
});

app.post('/api/system/reboot-device', compatAuth, (req, res) => {
    res.json({ ok: true, data: { message: 'Rebooting device...' } });
    spawn('sudo', ['reboot']);
});

app.post('/api/system/update', compatAuth, (req, res) => {
    res.json({ ok: true, data: { message: 'Pulling updates in background...' } });
    spawn('sh', ['-c', 'git pull && npm install && sudo apt update && sudo apt upgrade -y && sudo systemctl restart stage-timer'], { cwd: __dirname });
});

app.post('/api/system/network/hostname', compatAuth, express.json(), (req, res) => {
    const name = req.body.name;
    // Basic validation to prevent command injection
    if(name && /^[a-zA-Z0-9-]+$/.test(name)) {
        spawn('sudo', ['hostnamectl', 'set-hostname', name]);
        res.json({ ok: true, data: { message: 'Hostname updated.' } });
    } else {
        res.status(400).json({ ok: false, error: { code: 'INVALID_PAYLOAD', message: 'Missing or invalid hostname' } });
    }
});

// V1 Compat for wifi/ap because frontend might be deeply coupled currently:
app.get('/api/system/ap', compatAuth, (req, res) => {
    const action = req.query.action === 'on' ? 'up' : 'down';
    spawn('sudo', ['nmcli', 'con', action, 'StageTimer_Fallback']);
    res.send(`AP ${action}`);
});

app.get('/api/system/ap/status', compatAuth, (req, res) => {
    const child = spawn('nmcli', ['-t', '-f', 'NAME', 'con', 'show', '--active']);
    let output = '';
    child.stdout.on('data', data => output += data.toString());
    child.on('close', () => {
        const isActive = output.includes('StageTimer_Fallback');
        res.json({ active: isActive });
    });
});

app.get('/api/system/wifi/scan', compatAuth, (req, res) => {
    const child = spawn('sudo', ['nmcli', '-t', '-f', 'SSID,SIGNAL', 'dev', 'wifi', 'list']);
    let output = '';
    child.stdout.on('data', data => output += data.toString());
    child.on('close', (code) => {
        if (code !== 0) return res.status(500).json([]);
        const networks = [];
        const seen = new Set();
        output.split('\n').forEach(line => {
            const [ssid, signal] = line.split(':');
            if (ssid && ssid.trim() !== '' && !seen.has(ssid)) {
                seen.add(ssid);
                networks.push({ ssid, signal });
            }
        });
        res.json(networks);
    });
});

app.get('/api/system/wifi/connect', compatAuth, (req, res) => {
    const { ssid, password } = req.query;
    if (!ssid) return res.status(400).send('SSID required');
    const args = ['nmcli', 'dev', 'wifi', 'connect', ssid];
    if (password) {
        args.push('password', password);
    }
    const child = spawn('sudo', args);
    child.on('close', (code) => {
        if (code !== 0) return res.status(500).send('Connection Failed');
        res.send('Connected!');
    });
});

app.get('/api/system/wifi/static', compatAuth, (req, res) => {
    const { ssid, ip, gateway } = req.query;
    if(ip === 'auto') {
        spawn('sh', ['-c', `sudo nmcli con modify "${ssid}" ipv4.method auto && sudo nmcli con up "${ssid}"`]);
    } else {
        spawn('sh', ['-c', `sudo nmcli con modify "${ssid}" ipv4.addresses ${ip} ipv4.gateway ${gateway} ipv4.method manual && sudo nmcli con up "${ssid}"`]);
    }
    res.send('IP Configured');
});

// Editable Quick Messages Endpoints (V1 Compat)
app.get('/api/messages', (req, res) => res.json(quickMessages));

app.get('/api/messages/add', compatAuth, (req, res) => {
    const text = req.query.text;
    if (text && !quickMessages.includes(text)) {
        quickMessages.push(text);
        saveMessages();
        io.emit('messagesUpdate', quickMessages);
    }
    res.send('Added');
});

app.get('/api/messages/remove', compatAuth, (req, res) => {
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
    const v1State = timerEngine.getV1State(netInfo, logoData, blink_state);
    const timeLeft = v1State.timeLeft * (timerEngine.getDisplayState().isNegative ? -1 : 1);
    const abs = Math.abs(timeLeft);
    const timeStr = (timeLeft < 0 ? "-" : "") +
                    Math.floor(abs/60).toString().padStart(2,'0') + ":" + 
                    (abs%60).toString().padStart(2,'0');
    
    const overTimeStr = timeLeft < 0
                        ? "+" + Math.floor(abs/60).toString().padStart(2,'0') + ":" + (abs%60).toString().padStart(2,'0') 
                        : "";

    res.json({ 
        time: timeStr, 
        running: v1State.isRunning,
        msg_active: v1State.showMessage,
        raw_seconds: timeLeft,
        over_time: overTimeStr,
        mode: v1State.mode,
        blink_state: v1State.blink_state,
        messages: quickMessages
    });
});

function broadcast() {
    io.emit('stateUpdate', timerEngine.getV1State(netInfo, logoData, blink_state));
}

io.on('connection', (socket) => {
    socket.emit('stateUpdate', timerEngine.getV1State(netInfo, logoData, blink_state));
    socket.emit('messagesUpdate', quickMessages); 
});

app.use(express.static(path.join(__dirname, 'public')));
server.listen(apiAuth.config.port, apiAuth.config.bindHost, () => {
    console.log(`Server running on http://${apiAuth.config.bindHost}:${apiAuth.config.port}`);
});