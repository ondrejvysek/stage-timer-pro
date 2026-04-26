const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

const DEFAULT_CONFIG = {
  adminToken: '',
  bindHost: '0.0.0.0',
  corsOrigin: '*',
  roomName: 'Stage Timer',
  uuid: null,
};

const DEFAULT_STATE = {
  durationSeconds: 600,
  pausedRemainingSeconds: 600,
  targetTimestamp: null,
  startedAt: null,
  isRunning: false,
  mode: 'countdown',
  message: '',
  showMessage: false,
  currentIndex: 0,
  targetISO: null,
};

const DEFAULT_DISPLAY = {
  keyMode: 'none',
  position: 4,
  scale: 1,
  margin: 24,
};

const DEFAULT_RUNDOWN = [];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2));
  fs.renameSync(tempPath, filePath);
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

class StateStore {
  constructor() {
    this.dataDir = DATA_DIR;
    this.configPath = path.join(this.dataDir, 'config.json');
    this.statePath = path.join(this.dataDir, 'state.json');
    this.displayPath = path.join(this.dataDir, 'display.json');
    this.rundownPath = path.join(this.dataDir, 'rundown.json');
  }

  init() {
    ensureDir(this.dataDir);

    const config = { ...DEFAULT_CONFIG, ...readJson(this.configPath, {}) };
    const state = { ...DEFAULT_STATE, ...readJson(this.statePath, {}) };
    const display = { ...DEFAULT_DISPLAY, ...readJson(this.displayPath, {}) };
    const rundown = readJson(this.rundownPath, DEFAULT_RUNDOWN);

    writeJsonAtomic(this.configPath, config);
    writeJsonAtomic(this.statePath, state);
    writeJsonAtomic(this.displayPath, display);
    writeJsonAtomic(this.rundownPath, rundown);

    return { config, state, display, rundown };
  }

  saveState(state) {
    writeJsonAtomic(this.statePath, state);
  }

  saveConfig(config) {
    writeJsonAtomic(this.configPath, config);
  }

  saveDisplay(display) {
    writeJsonAtomic(this.displayPath, display);
  }

  saveRundown(rundown) {
    writeJsonAtomic(this.rundownPath, rundown);
  }
}

module.exports = {
  StateStore,
  DEFAULT_CONFIG,
  DEFAULT_STATE,
  DEFAULT_DISPLAY,
  DEFAULT_RUNDOWN,
  writeJsonAtomic,
};
