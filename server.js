const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { execFile } = require('child_process');
const crypto = require('crypto');

const { StateStore } = require('./backend/lib/state-store');
const { TimerEngine } = require('./backend/lib/timer-engine');
const { QueueEngine } = require('./backend/lib/queue-engine');

const app = express();
app.use(express.json({ limit: '10mb' }));

const store = new StateStore();
const bootData = store.init();

if (!bootData.config.uuid) {
  bootData.config.uuid = crypto.randomUUID();
  store.saveConfig(bootData.config);
}

const bindHost = process.env.BIND_HOST || '0.0.0.0';
const corsOrigin = process.env.CORS_ORIGIN || bootData.config.corsOrigin || '*';
const adminToken = process.env.STAGE_TIMER_ADMIN_TOKEN || bootData.config.adminToken || '';
const strictV2Only = process.env.STAGE_TIMER_V2_ONLY === 'true' || bootData.config.v2OnlyMode === true;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', corsOrigin);
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-stage-timer-token');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const server = http.createServer(app);
const io = new Server(server);

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

const messagesFile = path.join(__dirname, 'messages.json');
const logoFile = path.join(__dirname, 'logo.json');
const logsDir = path.join(__dirname, 'logs');
const actualsLogFile = path.join(logsDir, 'actuals.csv');
let quickMessages = ['Wrap Up Now', 'Q&A Starting', '5 Minutes Left', 'Speak Up'];
let logoData = '';

try {
  if (fs.existsSync(messagesFile)) quickMessages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
  else fs.writeFileSync(messagesFile, JSON.stringify(quickMessages));
} catch (error) {
  console.error('Could not load messages.json', error);
}

try {
  if (fs.existsSync(logoFile)) {
    const parsed = JSON.parse(fs.readFileSync(logoFile, 'utf8'));
    if (parsed && parsed.image) logoData = parsed.image;
  }
} catch (error) {
  console.error('Could not load logo.json', error);
}

const timer = new TimerEngine({ ...bootData.state, logoData });
const queue = new QueueEngine(bootData.rundown, timer.state.currentIndex || 0);

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function saveMessages() {
  try {
    fs.writeFileSync(messagesFile, JSON.stringify(quickMessages));
  } catch (error) {
    console.error('Could not save messages.json', error);
  }
}

function persistState() {
  store.saveState(timer.getPersistedState());
}

function persistRundown() {
  store.saveRundown(queue.rundown);
}

function publicState() {
  return timer.getPublicState({
    ...getNetworkInfo(),
    logoData: timer.state.logoData || logoData,
    rundownLength: queue.rundown.length,
    currentSegment: queue.getCurrent(),
    currentIndex: queue.currentIndex,
    v2OnlyMode: strictV2Only,
  });
}

function broadcast() {
  io.emit('stateUpdate', publicState());
}

function structuredError(res, code, message, details = null) {
  return res.status(code).json({ error: message, details });
}

function requireAdmin(req, res, next) {
  if (!adminToken) return next();
  const token = req.header('x-stage-timer-token');
  if (!token) return structuredError(res, 401, 'Missing admin token');
  if (token !== adminToken) return structuredError(res, 403, 'Invalid admin token');
  next();
}

function parseIntField(value, fieldName, opts = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) return { error: `${fieldName} must be a number` };
  const val = Math.floor(num);
  if (opts.min != null && val < opts.min) return { error: `${fieldName} must be >= ${opts.min}` };
  if (opts.max != null && val > opts.max) return { error: `${fieldName} must be <= ${opts.max}` };
  return { value: val };
}

function legacyRoute(pathName, handler, options = {}) {
  app.get(pathName, (req, res, next) => {
    if (strictV2Only) {
      return res.status(410).json({ error: 'Legacy GET routes are disabled in v2-only mode' });
    }
    res.setHeader('Warning', '299 - Deprecated GET; use POST variant');
    if (options.auth) return requireAdmin(req, res, () => handler(req, res, next));
    return handler(req, res, next);
  });
}

function runCommand(bin, args, cb) {
  execFile(bin, args, (error, stdout, stderr) => cb(error, stdout, stderr));
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (!/[,"\n]/.test(str)) return str;
  return `"${str.replace(/"/g, '""')}"`;
}

function appendActualsLog(segmentName, plannedSeconds, actualSeconds) {
  const timestamp = new Date().toISOString();
  const delta = actualSeconds - plannedSeconds;
  const line = [
    csvEscape(timestamp),
    csvEscape(segmentName),
    csvEscape(plannedSeconds),
    csvEscape(actualSeconds),
    csvEscape(delta),
  ].join(',') + '\n';

  if (!fs.existsSync(actualsLogFile)) {
    fs.writeFileSync(actualsLogFile, 'timestamp,speaker,planned_seconds,actual_seconds,delta_seconds\n');
  }

  fs.appendFileSync(actualsLogFile, line);
}

function applySegmentToTimer(segment, autoStart = false) {
  if (!segment) return;
  timer.setMode(segment.mode || 'countdown');
  timer.reset(segment.duration || 0);
  if (autoStart) timer.start();
}

app.get('/manifest.json', (req, res) => {
  res.json({
    name: 'Stage Timer Pro',
    short_name: 'Stage Timer',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [{ src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' }],
  });
});

app.get('/icon.svg', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%230f172a'/><text x='50' y='65' font-family='sans-serif' font-size='50' font-weight='bold' fill='%2322c55e' text-anchor='middle'>ST</text></svg>");
});

app.get('/api/state', (req, res) => res.json(publicState()));
app.get('/api/messages', (req, res) => res.json(quickMessages));

app.post('/api/start', (req, res) => {
  timer.start();
  persistState();
  broadcast();
  res.json({ ok: true, status: 'Started' });
});
legacyRoute('/api/start', (req, res) => {
  timer.start();
  persistState();
  broadcast();
  res.send('Started');
});

app.post('/api/pause', (req, res) => {
  timer.pause();
  persistState();
  broadcast();
  res.json({ ok: true, status: 'Paused' });
});
legacyRoute('/api/pause', (req, res) => {
  timer.pause();
  persistState();
  broadcast();
  res.send('Paused');
});

app.post('/api/toggle_playback', (req, res) => {
  timer.togglePlayback();
  persistState();
  broadcast();
  res.json({ ok: true, running: timer.state.isRunning });
});
legacyRoute('/api/toggle_playback', (req, res) => {
  timer.togglePlayback();
  persistState();
  broadcast();
  res.send(timer.state.isRunning ? 'Started' : 'Paused');
});

function handleResetInput(req) {
  const raw = req.body?.sec ?? req.query?.sec;
  return parseIntField(raw ?? timer.state.durationSeconds, 'sec', { min: 0, max: 86400 });
}

app.post('/api/reset', requireAdmin, (req, res) => {
  const parsed = handleResetInput(req);
  if (parsed.error) return structuredError(res, 400, 'Invalid payload', parsed.error);
  timer.reset(parsed.value);
  persistState();
  broadcast();
  res.json({ ok: true, status: 'Reset' });
});
legacyRoute('/api/reset', (req, res) => {
  const parsed = handleResetInput(req);
  if (parsed.error) return res.status(400).send(parsed.error);
  timer.reset(parsed.value);
  persistState();
  broadcast();
  res.send('Reset');
}, { auth: true });

app.post('/api/add', (req, res) => {
  const parsed = parseIntField(req.body?.sec ?? req.query?.sec ?? 0, 'sec', { min: -7200, max: 7200 });
  if (parsed.error) return structuredError(res, 400, 'Invalid payload', parsed.error);
  timer.add(parsed.value);
  persistState();
  broadcast();
  res.json({ ok: true, status: 'Adjusted' });
});
legacyRoute('/api/add', (req, res) => {
  const parsed = parseIntField(req.query?.sec ?? 0, 'sec', { min: -7200, max: 7200 });
  if (parsed.error) return res.status(400).send(parsed.error);
  timer.add(parsed.value);
  persistState();
  broadcast();
  res.send('Adjusted');
});

app.post('/api/mode', requireAdmin, (req, res) => {
  const mode = req.body?.set;
  if (mode === 'target') {
    const targetISO = req.body?.targetISO;
    if (!targetISO || Number.isNaN(new Date(targetISO).getTime())) {
      return structuredError(res, 400, 'Invalid payload', 'targetISO is required for target mode');
    }
    timer.state.targetISO = targetISO;
  }
  if (!timer.setMode(mode)) return structuredError(res, 400, 'Invalid payload', 'Invalid mode');
  persistState();
  broadcast();
  res.json({ ok: true, status: 'Mode updated' });
});
legacyRoute('/api/mode', (req, res) => {
  const mode = req.query?.set;
  if (mode === 'target') {
    const targetISO = req.query?.targetISO;
    if (!targetISO || Number.isNaN(new Date(targetISO).getTime())) return res.status(400).send('Missing targetISO');
    timer.state.targetISO = targetISO;
  }
  if (!timer.setMode(mode)) return res.status(400).send('Invalid Mode');
  persistState();
  broadcast();
  res.send('Mode updated');
}, { auth: true });

app.post('/api/message/toggle', (req, res) => {
  timer.toggleMessage();
  persistState();
  broadcast();
  res.json({ ok: true, showMessage: timer.state.showMessage });
});
legacyRoute('/api/message/toggle', (req, res) => {
  timer.toggleMessage();
  persistState();
  broadcast();
  res.send(timer.state.showMessage ? 'Message Shown' : 'Message Hidden');
});

app.post('/api/message/set', (req, res) => {
  const text = req.body?.text ?? req.query?.text ?? '';
  const sourceRaw = String(req.body?.source ?? req.query?.source ?? 'manual');
  const source = ['manual', 'auto_rundown', 'quick_message'].includes(sourceRaw) ? sourceRaw : 'manual';
  timer.setMessage(String(text).slice(0, 280), source);
  persistState();
  broadcast();
  res.json({ ok: true });
});
legacyRoute('/api/message/set', (req, res) => {
  timer.setMessage(req.query.text || '', 'manual');
  persistState();
  broadcast();
  res.send('Message Set');
});

app.post('/api/message/trigger', (req, res) => {
  const parsed = parseIntField(req.body?.index ?? req.query?.index, 'index', { min: 0, max: quickMessages.length - 1 });
  if (parsed.error) return structuredError(res, 400, 'Invalid payload', parsed.error);
  timer.setMessage(quickMessages[parsed.value], 'quick_message');
  timer.state.showMessage = true;
  persistState();
  broadcast();
  res.json({ ok: true });
});
legacyRoute('/api/message/trigger', (req, res) => {
  const index = parseInt(req.query.index, 10);
  if (Number.isNaN(index) || index < 0 || index >= quickMessages.length) return res.status(400).send('Invalid Message Index');
  timer.setMessage(quickMessages[index], 'quick_message');
  timer.state.showMessage = true;
  persistState();
  broadcast();
  res.send('Message Triggered Live');
});

app.post('/api/system/logo/upload', requireAdmin, (req, res) => {
  if (!req.body || typeof req.body.image !== 'string' || req.body.image.length === 0) {
    return structuredError(res, 400, 'Invalid payload', 'image is required');
  }
  timer.state.logoData = req.body.image;
  logoData = req.body.image;
  fs.writeFileSync(logoFile, JSON.stringify({ image: logoData }));
  persistState();
  broadcast();
  return res.json({ ok: true, status: 'Logo Uploaded' });
});

app.post('/api/system/logo/clear', requireAdmin, (req, res) => {
  timer.state.logoData = '';
  logoData = '';
  if (fs.existsSync(logoFile)) fs.unlinkSync(logoFile);
  persistState();
  broadcast();
  res.json({ ok: true, status: 'Logo Cleared' });
});
legacyRoute('/api/system/logo/clear', (req, res) => {
  timer.state.logoData = '';
  logoData = '';
  if (fs.existsSync(logoFile)) fs.unlinkSync(logoFile);
  persistState();
  broadcast();
  res.send('Logo Cleared');
}, { auth: true });

app.post('/api/system/restart', requireAdmin, (req, res) => {
  res.json({ ok: true, status: 'Restarting system service' });
  runCommand('sudo', ['systemctl', 'restart', 'stage-timer'], () => {});
});

app.post('/api/system/update', requireAdmin, (req, res) => {
  res.json({ ok: true, status: 'Pulling firmware and system updates' });
  runCommand('bash', ['-lc', 'git pull && npm install && sudo apt update && sudo apt upgrade -y && sudo systemctl restart stage-timer'], () => {});
});

app.post('/api/system/hostname', requireAdmin, (req, res) => {
  const name = req.body?.name;
  if (!name || typeof name !== 'string' || !/^[a-zA-Z0-9-]{1,63}$/.test(name)) {
    return structuredError(res, 400, 'Invalid payload', 'name must be 1-63 chars [a-zA-Z0-9-]');
  }
  runCommand('sudo', ['hostnamectl', 'set-hostname', name], (error) => {
    if (error) return structuredError(res, 500, 'Failed to update hostname');
    return res.json({ ok: true, status: 'Hostname updated' });
  });
});

app.post('/api/system/ap', requireAdmin, (req, res) => {
  const action = req.body?.action;
  if (!['on', 'off'].includes(action)) return structuredError(res, 400, 'Invalid payload', 'action must be on/off');
  const desired = action === 'on' ? 'up' : 'down';
  runCommand('sudo', ['nmcli', 'con', desired, 'StageTimer_Fallback'], (error) => {
    if (error) return structuredError(res, 500, 'Failed to switch fallback AP');
    return res.json({ ok: true, status: `AP ${desired}` });
  });
});

app.get('/api/system/ap/status', requireAdmin, (req, res) => {
  runCommand('nmcli', ['-t', '-f', 'NAME', 'con', 'show', '--active'], (error, stdout) => {
    if (error) return res.json({ active: false });
    const isActive = stdout.includes('StageTimer_Fallback');
    return res.json({ active: isActive });
  });
});

app.post('/api/system/wifi/scan', requireAdmin, (req, res) => {
  runCommand('sudo', ['nmcli', '-t', '-f', 'SSID,SIGNAL', 'dev', 'wifi', 'list'], (error, stdout) => {
    if (error) return res.status(500).json([]);
    const networks = [];
    const seen = new Set();
    stdout.split('\n').forEach((line) => {
      const [ssid, signal] = line.split(':');
      if (ssid && ssid.trim() !== '' && !seen.has(ssid)) {
        seen.add(ssid);
        networks.push({ ssid, signal });
      }
    });
    return res.json(networks);
  });
});

app.post('/api/system/wifi/connect', requireAdmin, (req, res) => {
  const ssid = req.body?.ssid;
  const password = req.body?.password;
  if (!ssid || typeof ssid !== 'string' || ssid.length > 128) {
    return structuredError(res, 400, 'Invalid payload', 'ssid is required (1-128 chars)');
  }

  const args = ['nmcli', 'dev', 'wifi', 'connect', ssid];
  if (password) args.push('password', String(password));

  runCommand('sudo', args, (error) => {
    if (error) return structuredError(res, 500, 'Connection failed');
    return res.json({ ok: true, status: 'Connected' });
  });
});

app.post('/api/system/wifi/static', requireAdmin, (req, res) => {
  const { ssid, ip, gateway } = req.body || {};
  if (!ssid || typeof ssid !== 'string') return structuredError(res, 400, 'Invalid payload', 'ssid is required');

  if (ip === 'auto') {
    runCommand('sudo', ['nmcli', 'con', 'modify', ssid, 'ipv4.method', 'auto'], (error) => {
      if (error) return structuredError(res, 500, 'Failed to set DHCP');
      runCommand('sudo', ['nmcli', 'con', 'up', ssid], (upError) => {
        if (upError) return structuredError(res, 500, 'Failed to activate connection');
        return res.json({ ok: true, status: 'IP Configured' });
      });
    });
    return;
  }

  if (!ip || !gateway) return structuredError(res, 400, 'Invalid payload', 'ip and gateway are required unless ip=auto');

  runCommand('sudo', ['nmcli', 'con', 'modify', ssid, 'ipv4.addresses', ip, 'ipv4.gateway', gateway, 'ipv4.method', 'manual'], (error) => {
    if (error) return structuredError(res, 500, 'Failed to set static IP');
    runCommand('sudo', ['nmcli', 'con', 'up', ssid], (upError) => {
      if (upError) return structuredError(res, 500, 'Failed to activate connection');
      return res.json({ ok: true, status: 'IP Configured' });
    });
  });
});

app.post('/api/messages/add', requireAdmin, (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (!text) return structuredError(res, 400, 'Invalid payload', 'text is required');
  if (!quickMessages.includes(text)) {
    quickMessages.push(text);
    saveMessages();
    io.emit('messagesUpdate', quickMessages);
  }
  res.json({ ok: true, messages: quickMessages });
});
legacyRoute('/api/messages/add', (req, res) => {
  const text = req.query.text;
  if (text && !quickMessages.includes(text)) {
    quickMessages.push(text);
    saveMessages();
    io.emit('messagesUpdate', quickMessages);
  }
  res.send('Added');
}, { auth: true });

app.post('/api/messages/remove', requireAdmin, (req, res) => {
  const parsed = parseIntField(req.body?.index, 'index', { min: 0, max: quickMessages.length - 1 });
  if (parsed.error) return structuredError(res, 400, 'Invalid payload', parsed.error);
  quickMessages.splice(parsed.value, 1);
  saveMessages();
  io.emit('messagesUpdate', quickMessages);
  res.json({ ok: true, messages: quickMessages });
});
legacyRoute('/api/messages/remove', (req, res) => {
  const index = parseInt(req.query.index, 10);
  if (!Number.isNaN(index) && index >= 0 && index < quickMessages.length) {
    quickMessages.splice(index, 1);
    saveMessages();
    io.emit('messagesUpdate', quickMessages);
  }
  res.send('Removed');
}, { auth: true });

app.get('/api/rundown', (req, res) => {
  res.json(queue.getState());
});

app.post('/api/rundown/set', requireAdmin, (req, res) => {
  const rundown = req.body?.rundown;
  if (!Array.isArray(rundown)) return structuredError(res, 400, 'Invalid payload', 'rundown must be an array');

  queue.setRundown(rundown);
  timer.state.currentIndex = queue.currentIndex;
  persistRundown();
  persistState();
  broadcast();

  res.json({ ok: true, ...queue.getState() });
});

app.post('/api/rundown/item/add', requireAdmin, (req, res) => {
  const segment = req.body?.segment;
  if (!segment || typeof segment !== 'object') return structuredError(res, 400, 'Invalid payload', 'segment is required');
  queue.addSegment(segment);
  persistRundown();
  broadcast();
  res.json({ ok: true, ...queue.getState() });
});

app.post('/api/rundown/item/update', requireAdmin, (req, res) => {
  const parsed = parseIntField(req.body?.index, 'index', { min: 0, max: queue.rundown.length - 1 });
  if (parsed.error) return structuredError(res, 400, 'Invalid payload', parsed.error);
  const segment = req.body?.segment;
  if (!segment || typeof segment !== 'object') return structuredError(res, 400, 'Invalid payload', 'segment is required');
  const updated = queue.updateSegment(parsed.value, segment);
  persistRundown();
  broadcast();
  res.json({ ok: true, segment: updated, ...queue.getState() });
});

app.post('/api/rundown/item/remove', requireAdmin, (req, res) => {
  const parsed = parseIntField(req.body?.index, 'index', { min: 0, max: queue.rundown.length - 1 });
  if (parsed.error) return structuredError(res, 400, 'Invalid payload', parsed.error);
  const removed = queue.removeSegment(parsed.value);
  timer.state.currentIndex = queue.currentIndex;
  persistRundown();
  persistState();
  broadcast();
  res.json({ ok: true, removed, ...queue.getState() });
});

app.post('/api/rundown/next', requireAdmin, (req, res) => {
  const current = queue.getCurrent();
  if (current) {
    const actual = current.mode === 'countdown'
      ? Math.max(0, (current.duration || 0) - Math.max(0, timer.getRemainingSeconds()))
      : Math.max(0, timer.getRemainingSeconds());
    appendActualsLog(current.name, current.duration || 0, actual);
  }

  const nextSegment = queue.next();
  if (!nextSegment) return structuredError(res, 400, 'No rundown loaded');

  timer.state.currentIndex = queue.currentIndex;
  applySegmentToTimer(nextSegment, true);
  persistRundown();
  persistState();
  broadcast();
  res.json({ ok: true, currentSegment: nextSegment, currentIndex: queue.currentIndex });
});

app.post('/api/rundown/previous', requireAdmin, (req, res) => {
  const prevSegment = queue.previous();
  if (!prevSegment) return structuredError(res, 400, 'No rundown loaded');

  timer.state.currentIndex = queue.currentIndex;
  applySegmentToTimer(prevSegment, false);
  persistRundown();
  persistState();
  broadcast();
  res.json({ ok: true, currentSegment: prevSegment, currentIndex: queue.currentIndex });
});

app.post('/api/rundown/run-current', requireAdmin, (req, res) => {
  const current = queue.getCurrent();
  if (!current) return structuredError(res, 400, 'No rundown loaded');
  timer.state.currentIndex = queue.currentIndex;
  applySegmentToTimer(current, true);
  persistState();
  broadcast();
  res.json({ ok: true, currentSegment: current, currentIndex: queue.currentIndex });
});

app.get('/api/rundown/actuals/export', requireAdmin, (req, res) => {
  if (!fs.existsSync(actualsLogFile)) {
    return structuredError(res, 404, 'No actuals log available');
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=\"actuals.csv\"');
  return fs.createReadStream(actualsLogFile).pipe(res);
});

app.get('/api/companion', (req, res) => {
  const state = publicState();
  const abs = Math.abs(state.timeLeft);
  const timeStr = `${state.timeLeft < 0 ? '-' : ''}${Math.floor(abs / 60).toString().padStart(2, '0')}:${(abs % 60).toString().padStart(2, '0')}`;
  const overTimeStr = state.timeLeft < 0 ? `+${Math.floor(abs / 60).toString().padStart(2, '0')}:${(abs % 60).toString().padStart(2, '0')}` : '';
  res.json({
    time: timeStr,
    running: state.isRunning,
    msg_active: state.showMessage,
    raw_seconds: state.timeLeft,
    over_time: overTimeStr,
    mode: state.mode,
    blink_state: state.blink_state,
    messages: quickMessages,
    current_segment: queue.getCurrent() ? queue.getCurrent().name : '',
    current_index: queue.currentIndex,
    rundown_length: queue.rundown.length,
  });
});

setInterval(() => {
  if (timer.tickBlink()) broadcast();
}, 500);

setInterval(() => {
  if (timer.state.isRunning || timer.state.mode === 'timeofday' || timer.state.mode === 'target') {
    broadcast();
  }
}, 250);

io.on('connection', (socket) => {
  socket.emit('stateUpdate', publicState());
  socket.emit('messagesUpdate', quickMessages);
});

app.use(express.static(path.join(__dirname, 'public')));
server.listen(3000, bindHost, () => console.log(`Server running on ${bindHost}:3000`));
