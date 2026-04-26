class TimerEngine {
  constructor(initialState = {}) {
    this.state = {
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
      blink_state: false,
      ...initialState,
    };
  }

  nowMs() {
    return Date.now();
  }

  getRemainingSeconds() {
    if (this.state.mode === 'countup') {
      if (!this.state.startedAt) return this.state.pausedRemainingSeconds || 0;
      if (!this.state.isRunning) return this.state.pausedRemainingSeconds || 0;
      return Math.max(0, Math.floor((this.nowMs() - this.state.startedAt) / 1000));
    }

    if (this.state.mode === 'target') {
      const target = this.state.targetISO ? new Date(this.state.targetISO).getTime() : null;
      if (!target || Number.isNaN(target)) return 0;
      const diff = Math.floor((target - this.nowMs()) / 1000);
      return diff >= 0 ? diff : Math.abs(diff);
    }

    if (!this.state.isRunning || !this.state.targetTimestamp) {
      return this.state.pausedRemainingSeconds;
    }

    return Math.floor((this.state.targetTimestamp - this.nowMs()) / 1000);
  }

  tickBlink() {
    const timeLeft = this.getRemainingSeconds();
    if (this.state.isRunning && this.state.mode === 'countdown' && timeLeft <= 0) {
      this.state.blink_state = !this.state.blink_state;
      return true;
    }

    if (this.state.blink_state !== false) {
      this.state.blink_state = false;
      return true;
    }

    return false;
  }

  start() {
    if (this.state.isRunning) return;
    if (this.state.mode === 'countup') {
      const elapsedMs = (this.state.pausedRemainingSeconds || 0) * 1000;
      this.state.startedAt = this.nowMs() - elapsedMs;
      this.state.targetTimestamp = null;
    } else {
      const remaining = this.state.pausedRemainingSeconds ?? this.state.durationSeconds;
      this.state.targetTimestamp = this.nowMs() + (remaining * 1000);
      this.state.startedAt = this.nowMs();
    }
    this.state.isRunning = true;
  }

  pause() {
    if (!this.state.isRunning) return;
    this.state.pausedRemainingSeconds = this.getRemainingSeconds();
    this.state.isRunning = false;
    this.state.targetTimestamp = null;
    if (this.state.mode === 'countup') {
      this.state.startedAt = this.nowMs() - (this.state.pausedRemainingSeconds * 1000);
    }
  }

  togglePlayback() {
    if (this.state.isRunning) this.pause();
    else this.start();
  }

  reset(seconds) {
    const sec = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : this.state.durationSeconds;
    this.state.isRunning = false;
    this.state.durationSeconds = sec;
    this.state.pausedRemainingSeconds = this.state.mode === 'countup' ? 0 : sec;
    this.state.targetTimestamp = null;
    this.state.startedAt = this.nowMs();
  }

  add(seconds) {
    const delta = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
    if (this.state.mode === 'countup') {
      this.state.pausedRemainingSeconds = Math.max(0, (this.state.pausedRemainingSeconds || 0) + delta);
      if (this.state.isRunning) {
        this.state.startedAt = this.nowMs() - (this.state.pausedRemainingSeconds * 1000);
      }
      return;
    }

    if (this.state.isRunning && this.state.targetTimestamp) {
      this.state.targetTimestamp += delta * 1000;
    } else {
      this.state.pausedRemainingSeconds += delta;
    }
  }

  setMode(mode) {
    const validModes = ['countdown', 'countup', 'timeofday', 'logo', 'target'];
    if (!validModes.includes(mode)) return false;

    this.state.mode = mode;
    this.state.isRunning = false;
    this.state.targetTimestamp = null;

    if (mode === 'countup') {
      this.state.durationSeconds = 0;
      this.state.pausedRemainingSeconds = 0;
      this.state.startedAt = this.nowMs();
    } else if (mode === 'countdown') {
      if (this.state.durationSeconds < 0) this.state.durationSeconds = 0;
      this.state.pausedRemainingSeconds = this.state.durationSeconds;
      this.state.startedAt = this.nowMs();
    } else if (mode === 'target') {
      this.state.startedAt = this.nowMs();
      this.state.pausedRemainingSeconds = this.getRemainingSeconds();
    }

    return true;
  }

  setMessage(text) {
    this.state.message = text || '';
  }

  toggleMessage() {
    this.state.showMessage = !this.state.showMessage;
  }

  getPersistedState() {
    return {
      durationSeconds: this.state.durationSeconds,
      pausedRemainingSeconds: this.state.pausedRemainingSeconds,
      targetTimestamp: this.state.targetTimestamp,
      startedAt: this.state.startedAt,
      isRunning: this.state.isRunning,
      mode: this.state.mode,
      message: this.state.message,
      showMessage: this.state.showMessage,
      currentIndex: this.state.currentIndex,
      targetISO: this.state.targetISO,
    };
  }

  getPublicState(extra = {}) {
    const timeLeft = this.getRemainingSeconds();
    return {
      ...extra,
      ...this.state,
      timeLeft,
      initialTime: this.state.durationSeconds,
      pausedRemainingSeconds: this.state.pausedRemainingSeconds,
      targetTimestamp: this.state.targetTimestamp,
      durationSeconds: this.state.durationSeconds,
      targetISO: this.state.targetISO,
    };
  }
}

module.exports = {
  TimerEngine,
};
