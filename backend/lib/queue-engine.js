class QueueEngine {
  constructor(rundown = [], currentIndex = 0) {
    this.rundown = Array.isArray(rundown) ? rundown : [];
    this.currentIndex = Number.isInteger(currentIndex) ? currentIndex : 0;
    if (this.currentIndex < 0) this.currentIndex = 0;
    if (this.currentIndex >= this.rundown.length) this.currentIndex = Math.max(this.rundown.length - 1, 0);
  }

  sanitizeSegment(segment = {}) {
    const duration = Number.isFinite(Number(segment.duration)) ? Math.max(0, Math.floor(Number(segment.duration))) : 0;
    const mode = ['countdown', 'countup', 'timeofday', 'logo'].includes(segment.mode) ? segment.mode : 'countdown';

    return {
      name: String(segment.name || '').trim() || 'Untitled Segment',
      duration,
      mode,
      notes: String(segment.notes || ''),
    };
  }

  setRundown(rundown = []) {
    this.rundown = rundown.map((segment) => this.sanitizeSegment(segment));
    if (this.currentIndex >= this.rundown.length) {
      this.currentIndex = Math.max(this.rundown.length - 1, 0);
    }
    return this.getState();
  }

  addSegment(segment) {
    this.rundown.push(this.sanitizeSegment(segment));
    return this.getState();
  }

  updateSegment(index, segment) {
    if (!Number.isInteger(index) || index < 0 || index >= this.rundown.length) return null;
    this.rundown[index] = this.sanitizeSegment({ ...this.rundown[index], ...segment });
    return this.rundown[index];
  }

  removeSegment(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.rundown.length) return null;
    const removed = this.rundown.splice(index, 1)[0];
    if (this.currentIndex >= this.rundown.length) this.currentIndex = Math.max(this.rundown.length - 1, 0);
    return removed;
  }

  getCurrent() {
    if (!this.rundown.length) return null;
    return this.rundown[this.currentIndex] || null;
  }

  setCurrentIndex(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.rundown.length) return null;
    this.currentIndex = index;
    return this.getCurrent();
  }

  next() {
    if (!this.rundown.length) return null;
    if (this.currentIndex < this.rundown.length - 1) this.currentIndex += 1;
    return this.getCurrent();
  }

  previous() {
    if (!this.rundown.length) return null;
    if (this.currentIndex > 0) this.currentIndex -= 1;
    return this.getCurrent();
  }

  getState() {
    return {
      rundown: this.rundown,
      currentIndex: this.currentIndex,
      currentSegment: this.getCurrent(),
    };
  }
}

module.exports = {
  QueueEngine,
};
