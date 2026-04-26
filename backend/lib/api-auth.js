const crypto = require('crypto');
const stateStore = require('./state-store');

class ApiAuth {
    constructor() {
        this.config = this.loadConfig();
    }

    loadConfig() {
        const defaultCfg = {
            version: 2,
            uuid: stateStore.generateUuid(),
            roomName: "Stage Timer",
            discoveryEnabled: true,
            adminTokenHash: null,
            bindHost: "0.0.0.0",
            port: 3000,
            allowLanOnly: false,
            adminRequired: true
        };
        const config = stateStore.load('config', defaultCfg);

        // If no token exists, generate a pairing code on boot
        if (!config.adminTokenHash) {
            const rawCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // Example: "A1B2C3"
            this.pairingCode = rawCode;
            console.log('\n==================================================');
            console.log('NO ADMIN TOKEN FOUND.');
            console.log(`USE THIS PAIRING CODE FOR FIRST LOGIN: ${rawCode}`);
            console.log('==================================================\n');
        } else {
            this.pairingCode = null;
        }

        return config;
    }

    saveConfig() {
        stateStore.atomicWrite('config', this.config);
    }

    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    setToken(rawToken) {
        this.config.adminTokenHash = this.hashToken(rawToken);
        this.pairingCode = null;
        this.saveConfig();
        return true;
    }

    authenticateToken(req) {
        // We will allow auth via Authorization header: "Bearer <token>"
        const authHeader = req.headers['authorization'];
        let token = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }

        if (!token) return false;

        const hash = this.hashToken(token);
        return hash === this.config.adminTokenHash;
    }

    // Middleware to require admin
    requireAdmin() {
        return (req, res, next) => {
            if (!this.config.adminRequired) return next();

            if (this.authenticateToken(req)) {
                return next();
            }

            res.status(401).json({
                ok: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Admin token is missing or invalid'
                }
            });
        };
    }
}

module.exports = new ApiAuth();