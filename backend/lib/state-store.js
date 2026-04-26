const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../../data');
const LOGS_DIR = path.join(__dirname, '../../logs');

class StateStore {
    constructor() {
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    getFilePath(name) {
        return path.join(DATA_DIR, `${name}.json`);
    }

    atomicWrite(name, data) {
        const filePath = this.getFilePath(name);
        const tmpPath = `${filePath}.tmp`;
        const bakPath = `${filePath}.bak`;

        try {
            // 1. Serialize with stable formatting
            const json = JSON.stringify(data, null, 2);

            // 2. Write to filename.tmp
            fs.writeFileSync(tmpPath, json, 'utf8');

            // 3. Rename current file to filename.bak when appropriate
            if (fs.existsSync(filePath)) {
                fs.copyFileSync(filePath, bakPath);
            }

            // 4. Rename filename.tmp to filename
            fs.renameSync(tmpPath, filePath);

            return true;
        } catch (e) {
            console.error(`Atomic write failed for ${name}:`, e);
            return false;
        }
    }

    load(name, defaultData = null) {
        const filePath = this.getFilePath(name);
        const bakPath = `${filePath}.bak`;

        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (e) {
            console.error(`Failed to load ${filePath}, attempting recovery from backup...`, e);
            try {
                if (fs.existsSync(bakPath)) {
                    const data = JSON.parse(fs.readFileSync(bakPath, 'utf8'));
                    console.log(`Recovered ${name} from backup.`);
                    // Restore from backup
                    this.atomicWrite(name, data);
                    return data;
                }
            } catch (bakError) {
                console.error(`Failed to recover ${name} from backup:`, bakError);
            }
        }

        if (defaultData) {
            console.log(`Creating default ${name}.json`);
            this.atomicWrite(name, defaultData);
            return defaultData;
        }
        return null;
    }

    generateUuid() {
        return crypto.randomUUID();
    }
}

module.exports = new StateStore();