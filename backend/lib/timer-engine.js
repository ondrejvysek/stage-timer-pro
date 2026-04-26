const stateStore = require('./state-store');

class TimerEngine {
    constructor() {
        this.state = null;
        this.loadState();
    }

    getDefaultState() {
        return {
            version: 2,
            node: {
                uuid: stateStore.generateUuid(),
                roomName: "Stage Timer",
                role: "standalone",
                discoveryEnabled: true
            },
            timer: {
                mode: "countdown",
                status: "paused",
                durationSeconds: 600,
                startedAt: null,
                targetTimestamp: null,
                pausedRemainingSeconds: 600,
                targetISO: null,
                overtimeBehavior: "countUp",
                message: "",
                messageVisible: false
            },
            rundown: {
                currentIndex: 0,
                activeItemId: null
            },
            display: {
                keyMode: "none",
                position: 8,
                scale: 1,
                margin: 32,
                theme: "default"
            },
            sync: {
                leaderUuid: null,
                offsetMs: 0,
                jitterMs: null,
                quality: "local"
            },
            updatedAt: new Date().toISOString()
        };
    }

    loadState() {
        this.state = stateStore.load('state', this.getDefaultState());

        // Ensure data consistency on boot
        if (!this.state.node.uuid) {
            this.state.node.uuid = stateStore.generateUuid();
        }

        // If it was running before crash/restart and we lost targetTimestamp, fallback to paused
        if (this.state.timer.status === 'running' && !this.state.timer.targetTimestamp) {
            this.state.timer.status = 'paused';
            if (this.state.timer.pausedRemainingSeconds === null) {
                this.state.timer.pausedRemainingSeconds = this.state.timer.durationSeconds;
            }
        }

        this.persistState();
    }

    persistState() {
        this.state.updatedAt = new Date().toISOString();
        stateStore.atomicWrite('state', this.state);
    }

    // --- Actions ---

    start(durationSeconds = null) {
        if (durationSeconds !== null) {
            this.state.timer.durationSeconds = durationSeconds;
            this.state.timer.pausedRemainingSeconds = durationSeconds;
        }

        const now = Date.now();
        this.state.timer.startedAt = new Date(now).toISOString();

        if (this.state.timer.pausedRemainingSeconds !== null) {
            // Resuming or fresh start
            this.state.timer.targetTimestamp = now + (this.state.timer.pausedRemainingSeconds * 1000);
        } else {
             // Fallback
             this.state.timer.targetTimestamp = now + (this.state.timer.durationSeconds * 1000);
        }

        this.state.timer.pausedRemainingSeconds = null;
        this.state.timer.status = 'running';

        this.persistState();
    }

    pause() {
        if (this.state.timer.status !== 'running') return;

        const now = Date.now();
        let remaining = 0;
        if (this.state.timer.targetTimestamp) {
            remaining = Math.max(0, Math.floor((this.state.timer.targetTimestamp - now) / 1000));
        }

        this.state.timer.pausedRemainingSeconds = remaining;
        this.state.timer.targetTimestamp = null;
        this.state.timer.status = 'paused';

        this.persistState();
    }

    reset(durationSeconds = null) {
        if (durationSeconds !== null) {
            this.state.timer.durationSeconds = durationSeconds;
        }

        this.state.timer.status = 'paused';
        this.state.timer.startedAt = null;
        this.state.timer.targetTimestamp = null;
        this.state.timer.pausedRemainingSeconds = this.state.timer.durationSeconds;

        this.persistState();
    }

    setMode(mode) {
        const allowedModes = ['countdown', 'countup', 'timeOfDay', 'idle', 'targetTime', 'logo'];
        if (allowedModes.includes(mode)) {
            this.state.timer.mode = mode;
            // When switching to countup, start from 0 if resetting
            if (mode === 'countup') {
                this.state.timer.durationSeconds = 0;
                this.state.timer.pausedRemainingSeconds = 0;
            }
            this.persistState();
            return true;
        }
        return false;
    }

    adjustTime(deltaSeconds) {
        if (this.state.timer.status === 'paused') {
            this.state.timer.pausedRemainingSeconds += deltaSeconds;
            if (this.state.timer.pausedRemainingSeconds < 0) this.state.timer.pausedRemainingSeconds = 0;
        } else if (this.state.timer.status === 'running') {
            if (this.state.timer.targetTimestamp) {
                // To add 60s, targetTimestamp gets pushed further into future
                this.state.timer.targetTimestamp += (deltaSeconds * 1000);
            }
        }
        this.persistState();
    }

    setMessage(text, visible) {
        this.state.timer.message = text;
        this.state.timer.messageVisible = visible;
        this.persistState();
    }

    toggleMessage() {
        this.state.timer.messageVisible = !this.state.timer.messageVisible;
        this.persistState();
    }

    // --- Calculation ---

    getDisplayState() {
        const now = Date.now();
        let displaySeconds = 0;
        let isNegative = false;

        if (this.state.timer.mode === 'countdown') {
            if (this.state.timer.status === 'running' && this.state.timer.targetTimestamp) {
                const diff = Math.floor((this.state.timer.targetTimestamp - now) / 1000);
                displaySeconds = diff;
                if (displaySeconds < 0) {
                    isNegative = true;
                }
            } else if (this.state.timer.status === 'paused' && this.state.timer.pausedRemainingSeconds !== null) {
                displaySeconds = this.state.timer.pausedRemainingSeconds;
            }
        } else if (this.state.timer.mode === 'countup') {
             if (this.state.timer.status === 'running' && this.state.timer.targetTimestamp) {
                 // For countup, targetTimestamp doesn't make much sense in the same way,
                 // but we can compute elapsed time since startedAt (or rather, just duration - remaining for now).
                 // Actually, if we start at 0, targetTimestamp = now + 0.
                 // The elapsed is (now - (targetTimestamp - duration))
                 // Let's keep it simple: just calculate elapsed based on startedAt and paused time.
                 // Or we can say: countup is just a negative countdown from 0.
                 const diff = Math.floor((now - this.state.timer.targetTimestamp) / 1000);
                 displaySeconds = diff; // should be positive
                 if (displaySeconds < 0) displaySeconds = 0;
             } else if (this.state.timer.status === 'paused') {
                 displaySeconds = -this.state.timer.pausedRemainingSeconds; // Store as negative?
                 // Wait, we set pausedRemainingSeconds to 0 on mode switch.
                 // If paused, just return elapsed time.
                 displaySeconds = this.state.timer.pausedRemainingSeconds || 0;
             }
        } else if (this.state.timer.mode === 'timeOfDay' || this.state.timer.mode === 'timeofday') {
             const d = new Date();
             displaySeconds = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
        }

        return {
            displaySeconds,
            isNegative,
            mode: this.state.timer.mode,
            status: this.state.timer.status,
            message: this.state.timer.message,
            messageVisible: this.state.timer.messageVisible
        };
    }

    getV1State(netInfo, logoData, blinkState) {
         // Bridge to V1 frontend format
         const ds = this.getDisplayState();
         return {
            timeLeft: ds.mode === 'timeOfDay' || ds.mode === 'timeofday' ? ds.displaySeconds : ds.displaySeconds,
            initialTime: this.state.timer.durationSeconds,
            isRunning: this.state.timer.status === 'running',
            message: this.state.timer.message,
            showMessage: this.state.timer.messageVisible,
            mode: this.state.timer.mode.toLowerCase() === 'timeofday' ? 'timeofday' : this.state.timer.mode,
            ip: netInfo.ip,
            netmask: netInfo.mask,
            logoData: logoData,
            blink_state: blinkState
        };
    }
}

module.exports = new TimerEngine();