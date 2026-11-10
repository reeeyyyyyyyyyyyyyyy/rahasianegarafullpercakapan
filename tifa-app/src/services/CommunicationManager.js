import wsService from './WebSocketService';
import adbForwardService from './ADBForwardService';
import { db } from '../database/indexedDB';

export const COMM_MODE = {
    WEBSOCKET: 'websocket',
    ADB_FORWARD: 'adb-forward',
};

class CommunicationManager {
    constructor() {
        this.primaryMode = COMM_MODE.WEBSOCKET; // User's preferred mode for sending
        this.wsService = wsService;
        this.adbService = adbForwardService;
        this.isInitialized = false;
        this.modeChangeListeners = [];
        this.internalListenersSetup = false;

        // Track connection status for both services
        this.wsConnected = false;
        this.adbConnected = false;

        // Message deduplication to prevent duplicate processing
        this.processedMessages = new Map();
        this.MESSAGE_DEDUPE_TTL = 5000; // 5 seconds

        // Setup internal connection tracking listeners (once)
        this._setupInternalListeners();
    }

    /**
     * Setup internal listeners for connection status tracking
     * Called once in constructor
     */
    _setupInternalListeners() {
        if (this.internalListenersSetup) return;

        // Track WebSocket connection status
        this.wsService.on('open', () => {
            this.wsConnected = true;
            console.log('[CommManager] WebSocket connected');
        });
        this.wsService.on('close', () => {
            this.wsConnected = false;
            console.log('[CommManager] WebSocket disconnected');
        });

        // Track ADB connection status
        this.adbService.on('open', () => {
            this.adbConnected = true;
            console.log('[CommManager] ADB connected');
        });
        this.adbService.on('close', () => {
            this.adbConnected = false;
            console.log('[CommManager] ADB disconnected');
        });

        this.internalListenersSetup = true;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            const modeSetting = await db.settings.get('comm_mode');
            if (modeSetting && modeSetting.setting_value) {
                let mode = modeSetting.setting_value;
                if (mode === 'usb-serial') {
                    mode = COMM_MODE.ADB_FORWARD;
                    await db.settings.put({
                        setting_key: 'comm_mode',
                        setting_value: mode,
                        setting_type: 'string',
                    });
                }

                this.primaryMode = mode;
            }

            const adbConfig = await db.settings.get('adb_forward_config');
            if (adbConfig && adbConfig.setting_value) {
                try {
                    const config = JSON.parse(adbConfig.setting_value);
                    this.adbService.setConfig(config);
                } catch (e) {
                    console.error('[CommManager] Failed to parse ADB config:', e);
                }
            }

            this.isInitialized = true;
        } catch (error) {
            console.error('[CommManager] Initialization error:', error);
            this.primaryMode = COMM_MODE.WEBSOCKET;
            this.isInitialized = true;
        }
    }

    getMode() {
        return this.primaryMode;
    }

    async setMode(mode) {
        if (mode !== COMM_MODE.WEBSOCKET && mode !== COMM_MODE.ADB_FORWARD) {
            return false;
        }

        this.primaryMode = mode;

        try {
            await db.settings.put({
                setting_key: 'comm_mode',
                setting_value: mode,
                setting_type: 'string',
                updated_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('[CommManager] Failed to save mode:', error);
        }

        this.modeChangeListeners.forEach(cb => cb(mode));
        return true;
    }

    async setADBConfig(config) {
        this.adbService.setConfig(config);
        try {
            await db.settings.put({
                setting_key: 'adb_forward_config',
                setting_value: JSON.stringify(config),
                setting_type: 'json',
                updated_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('[CommManager] Failed to save ADB config:', error);
        }
    }

    getADBConfig() {
        return this.adbService.getConfig();
    }

    /**
     * Connect BOTH services for dual communication
     */
    async connect(wsUrl, uiId) {
        await this.initialize();

        // Connect WebSocket
        console.log('[CommManager] Connecting WebSocket...');
        this.wsService.connect(wsUrl, uiId);

        // Connect ADB (will auto-reconnect if available)
        console.log('[CommManager] Connecting ADB...');
        this.adbService.connect({ uiId });

        return true;
    }

    /**
     * Disconnect BOTH services
     */
    async disconnect() {
        this.wsService.disconnect();
        this.adbService.disconnect();
        this.wsConnected = false;
        this.adbConnected = false;
    }

    /**
     * Get the active service based on priority and availability
     * Priority: primaryMode first, then fallback
     * Uses REAL connection state from services, not internal tracking
     */
    _getActiveService() {
        // Check real connection state from services
        const wsRealConnected = this.wsService.isConnected?.() ?? false;
        const adbRealConnected = this.adbService.isConnected ?? this.adbService.getIsConnected?.() ?? false;

        // Update internal tracking to match reality
        this.wsConnected = wsRealConnected;
        this.adbConnected = adbRealConnected;

        if (this.primaryMode === COMM_MODE.ADB_FORWARD) {
            // Primary is ADB
            if (adbRealConnected) return this.adbService;
            if (wsRealConnected) {
                console.log('[CommManager] ADB not connected, falling back to WebSocket');
                return this.wsService;
            }
        } else {
            // Primary is WebSocket
            if (wsRealConnected) return this.wsService;
            if (adbRealConnected) {
                console.log('[CommManager] WebSocket not connected, falling back to ADB');
                return this.adbService;
            }
        }

        // Neither connected, return null to indicate no connection
        return null;
    }

    /**
     * Check if connected and throw error if not
     * Uses REAL connection state, not DB/internal state
     * @returns {object} Active service
     * @throws {Error} If not connected
     */
    _requireConnection() {
        const service = this._getActiveService();
        if (!service) {
            throw new Error('Not connected to any service');
        }
        return service;
    }

    /**
     * Send message with connection validation
     */
    send(message) {
        const service = this._requireConnection();
        return service.send(message);
    }

    sendOperation(robotId, mapId, requestedBy, trayTasks, homeBase) {
        const service = this._requireConnection();
        return service.sendOperation(robotId, mapId, requestedBy, trayTasks, homeBase);
    }

    sendMove(robotId, sequence, dest, homeBase, type = null) {
        const service = this._requireConnection();
        return service.sendMove(robotId, sequence, dest, homeBase, type);
    }

    sendMode(robotId, mode) {
        const service = this._requireConnection();
        return service.sendMode(robotId, mode);
    }

    sendPickupConfirm(robotId, sequence, uiId) {
        const service = this._requireConnection();
        return service.sendPickupConfirm(robotId, sequence, uiId);
    }

    sendPickupCancel(robotId, sequence, uiId) {
        const service = this._requireConnection();
        return service.sendPickupCancel(robotId, sequence, uiId);
    }

    sendInterrupt(robotId) {
        const service = this._requireConnection();
        return service.sendInterrupt(robotId);
    }

    sendInterruptConfirm(robotId) {
        const service = this._requireConnection();
        return service.sendInterruptConfirm(robotId);
    }

    sendInterruptCancel(robotId) {
        const service = this._requireConnection();
        return service.sendInterruptCancel(robotId);
    }

    sendArrivalConfirm(robotId) {
        const service = this._requireConnection();
        return service.sendArrivalConfirm(robotId);
    }

    sendArrivalCancel(robotId) {
        const service = this._requireConnection();
        return service.sendArrivalCancel(robotId);
    }

    /**
     * Check if ANY service is connected (uses REAL state)
     */
    isConnected() {
        // Check real connection state
        const wsRealConnected = this.wsService.isConnected?.() ?? false;
        const adbRealConnected = this.adbService.isConnected ?? this.adbService.getIsConnected?.() ?? false;

        // Update internal tracking
        this.wsConnected = wsRealConnected;
        this.adbConnected = adbRealConnected;

        return wsRealConnected || adbRealConnected;
    }

    /**
     * Get detailed connection status (uses REAL state)
     */
    getConnectionStatus() {
        // _getActiveService already checks and updates real state
        const activeService = this._getActiveService();
        return {
            primaryMode: this.primaryMode,
            wsConnected: this.wsConnected,
            adbConnected: this.adbConnected,
            activeService: activeService
                ? (activeService === this.wsService ? 'websocket' : 'adb-forward')
                : null
        };
    }

    /**
     * Refresh connection status by checking actual connection state
     * Useful after reconnect or when status might be stale
     */
    refreshConnectionStatus() {
        // isConnected() already checks real state and updates internal tracking
        this.isConnected();
        return this.getConnectionStatus();
    }

    getState() {
        // Return state of the active service
        const service = this._getActiveService();
        return service ? service.getState() : { readyState: 3 }; // CLOSED
    }

    async testADBConnection() {
        return await this.adbService.testConnection();
    }

    async testConnection() {
        if (this.primaryMode === COMM_MODE.ADB_FORWARD) {
            return await this.adbService.testConnection();
        }
        // For WebSocket, test via connect
        return { success: this.wsConnected };
    }

    isADBAvailable() {
        return true;
    }

    /**
     * Generate a unique message ID for deduplication
     */
    _generateMessageId(message) {
        const type = message?.type || '';
        const data = JSON.stringify(message?.data || {});
        return `${type}:${data}`;
    }

    /**
     * Check if message was already processed (for deduplication)
     */
    _isDuplicateMessage(message) {
        const msgId = this._generateMessageId(message);
        const now = Date.now();

        // Cleanup old entries
        for (const [key, timestamp] of this.processedMessages) {
            if (now - timestamp > this.MESSAGE_DEDUPE_TTL) {
                this.processedMessages.delete(key);
            }
        }

        if (this.processedMessages.has(msgId)) {
            return true;
        }

        this.processedMessages.set(msgId, now);
        return false;
    }

    /**
     * Subscribe to events from BOTH services with deduplication
     * External listeners are tracked separately from internal listeners
     */
    on(event, callback) {
        // Track external callbacks for removal
        if (!this._externalCallbacks) {
            this._externalCallbacks = new Map();
        }

        if (event === 'message') {
            // Wrap message callback with deduplication
            const deduplicatedCallback = (message) => {
                if (!this._isDuplicateMessage(message)) {
                    callback(message);
                } else {
                    console.log('[CommManager] Duplicate message ignored:', message?.type);
                }
            };

            // Store reference for removal
            callback._dedupeWrapper = deduplicatedCallback;

            this.wsService.on(event, deduplicatedCallback);
            this.adbService.on(event, deduplicatedCallback);

            // Track for removeAllListeners
            if (!this._externalCallbacks.has(event)) {
                this._externalCallbacks.set(event, []);
            }
            this._externalCallbacks.get(event).push({ original: callback, wrapped: deduplicatedCallback });
        } else if (event === 'reconnecting' || event === 'open' || event === 'close' || event === 'error') {
            // Wrap callbacks to add service source info
            const wsCallback = (data) => {
                callback({ ...(data || {}), service: 'websocket', serviceName: 'WebSocket' });
            };
            const adbCallback = (data) => {
                callback({ ...(data || {}), service: 'adb', serviceName: 'ADB' });
            };

            this.wsService.on(event, wsCallback);
            this.adbService.on(event, adbCallback);

            // Track for removeAllListeners
            if (!this._externalCallbacks.has(event)) {
                this._externalCallbacks.set(event, []);
            }
            this._externalCallbacks.get(event).push({
                original: callback,
                wrappedWs: wsCallback,
                wrappedAdb: adbCallback
            });
        } else {
            // For other events
            this.wsService.on(event, callback);
            this.adbService.on(event, callback);

            // Track for removeAllListeners
            if (!this._externalCallbacks.has(event)) {
                this._externalCallbacks.set(event, []);
            }
            this._externalCallbacks.get(event).push({ original: callback, wrapped: callback });
        }
    }

    off(event, callback) {
        // Handle events with dual wrapped callbacks
        const dualWrappedEvents = ['reconnecting', 'open', 'close', 'error'];
        if (dualWrappedEvents.includes(event) && this._externalCallbacks?.has(event)) {
            const callbacks = this._externalCallbacks.get(event);
            const entry = callbacks.find(cb => cb.original === callback);
            if (entry) {
                this.wsService.off(event, entry.wrappedWs);
                this.adbService.off(event, entry.wrappedAdb);
                callbacks.splice(callbacks.indexOf(entry), 1);
            }
            return;
        }

        const actualCallback = callback._dedupeWrapper || callback;
        this.wsService.off(event, actualCallback);
        this.adbService.off(event, actualCallback);

        // Remove from tracking
        if (this._externalCallbacks?.has(event)) {
            const callbacks = this._externalCallbacks.get(event);
            const index = callbacks.findIndex(cb => cb.original === callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Remove all EXTERNAL listeners (keeps internal connection tracking intact)
     */
    removeAllListeners(event) {
        if (!this._externalCallbacks) return;

        if (event) {
            // Remove specific event listeners
            const callbacks = this._externalCallbacks.get(event) || [];
            callbacks.forEach((entry) => {
                if (entry.wrappedWs && entry.wrappedAdb) {
                    // reconnecting event
                    this.wsService.off(event, entry.wrappedWs);
                    this.adbService.off(event, entry.wrappedAdb);
                } else {
                    this.wsService.off(event, entry.wrapped);
                    this.adbService.off(event, entry.wrapped);
                }
            });
            this._externalCallbacks.set(event, []);
        } else {
            // Remove all external listeners
            for (const [evt, callbacks] of this._externalCallbacks) {
                callbacks.forEach((entry) => {
                    if (entry.wrappedWs && entry.wrappedAdb) {
                        // reconnecting event
                        this.wsService.off(evt, entry.wrappedWs);
                        this.adbService.off(evt, entry.wrappedAdb);
                    } else {
                        this.wsService.off(evt, entry.wrapped);
                        this.adbService.off(evt, entry.wrapped);
                    }
                });
            }
            this._externalCallbacks.clear();
        }

        if (event === 'message' || !event) {
            this.processedMessages.clear();
        }
    }

    /**
     * Send MAP_SELECTED command via active communication channel
     * @param {string} robotId - Target robot
     * @param {number} mapId   - Selected map ID
     */
    sendMapSelected(robotId, mapId) {
        if (this.mode === 'ADB' && this.adbService?.isConnected?.()) {
            return this.adbService.sendMapSelected(robotId, mapId);
        }
        return this.wsService.sendMapSelected(robotId, mapId);
    }

    onModeChange(callback) {
        this.modeChangeListeners.push(callback);
    }

    offModeChange(callback) {
        this.modeChangeListeners = this.modeChangeListeners.filter(cb => cb !== callback);
    }
}

const commManager = new CommunicationManager();

export default commManager;