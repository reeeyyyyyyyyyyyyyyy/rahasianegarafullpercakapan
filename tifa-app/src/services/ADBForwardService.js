import { Capacitor } from '@capacitor/core';
import ADBWebSocket from '../plugins/ADBWebSocket';

class ADBForwardService {
    constructor() {
        this.isConnected = false;
        this.uiId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.reconnectTimer = null;
        this.ws = null;

        this.config = {
            port: 12345,
            host: '127.0.0.1',
            protocol: 'ws',
        };

        this.listeners = {
            open: [],
            close: [],
            error: [],
            message: [],
            reconnecting: [],
        };

        this.setupNativeListeners();
    }

    isNative() {
        return Capacitor.isNativePlatform();
    }

    async setupNativeListeners() {
        if (!this.isNative()) {
            console.log('[ADBForward] Not on native platform');
            return;
        }

        try {
            await ADBWebSocket.addListener('onMessage', (data) => {
                if (data.message) {
                    this.handleMessage(data.message);
                }
            });

            await ADBWebSocket.addListener('onClose', (data) => {
                console.log('[ADBForward] Connection closed:', data);
                this.isConnected = false;
                this.emit('close', data);
                if (data.code !== 1000) {
                    this.attemptReconnect();
                }
            });

            await ADBWebSocket.addListener('onError', (data) => {
                console.error('[ADBForward] Error:', data);
                this.emit('error', data);
            });
        } catch (error) {
            console.error('[ADBForward] Setup error:', error);
        }
    }

    getUrl() {
        return this.config.protocol + '://' + this.config.host + ':' + this.config.port;
    }

    setConfig(config) {
        if (config.port) this.config.port = parseInt(config.port);
        if (config.host) this.config.host = config.host;
    }

    getConfig() {
        return Object.assign({}, this.config);
    }

    async connect(options) {
        options = options || {};
        this.uiId = options.uiId;
        var url = this.getUrl();
        console.log('[ADBForward] Connecting to:', url);

        if (!this.isNative()) {
            return this.connectFallback(options);
        }

        try {
            var result = await ADBWebSocket.connect({ url: url });
            if (result.connected) {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.sendSessionIdentify();
                this.emit('open');
            }
        } catch (error) {
            this.emit('error', { message: error.message || error });
            this.attemptReconnect();
        }
    }

    connectFallback(options) {
        options = options || {};
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            return;
        }

        this.uiId = options.uiId;
        var url = this.getUrl();
        var self = this;

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = function () {
                self.isConnected = true;
                self.reconnectAttempts = 0;
                self.sendSessionIdentify();
                self.emit('open');
            };

            this.ws.onclose = function (event) {
                self.isConnected = false;
                self.emit('close', { code: event.code, reason: event.reason });
                if (event.code !== 1000) {
                    self.attemptReconnect();
                }
            };

            this.ws.onerror = function (error) {
                self.emit('error', error);
            };

            this.ws.onmessage = function (event) {
                try {
                    var data = JSON.parse(event.data);
                    self.handleMessage(data);
                } catch (e) {
                    console.error('[ADBForward] Parse error:', e);
                }
            };
        } catch (error) {
            this.emit('error', error);
        }
    }

    async disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // Reset reconnect attempts on manual disconnect
        this.reconnectAttempts = 0;

        if (this.isNative()) {
            try {
                await ADBWebSocket.disconnect();
            } catch (error) {
                console.error('[ADBForward] Disconnect error:', error);
            }
        } else if (this.ws) {
            this.ws.close(1000, 'User disconnect');
            this.ws = null;
        }

        this.isConnected = false;
    }

    attemptReconnect() {
        var self = this;

        // Check if max attempts reached
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('[ADBForward] Max reconnect attempts reached');
            this.emit('reconnecting', {
                attempt: this.reconnectAttempts,
                maxAttempts: this.maxReconnectAttempts,
                failed: true
            });
            // Reset for next time
            this.reconnectAttempts = 0;
            return;
        }

        this.reconnectAttempts++;
        console.log('[ADBForward] Reconnecting attempt', this.reconnectAttempts, 'of', this.maxReconnectAttempts);

        this.emit('reconnecting', {
            attempt: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts,
            failed: false
        });

        this.reconnectTimer = setTimeout(function () {
            self.connect({ uiId: self.uiId });
        }, this.reconnectDelay);
    }

    /**
     * Force reconnect - used when USB is plugged back in
     */
    forceReconnect() {
        console.log('[ADBForward] Force reconnect triggered');
        this.reconnectAttempts = 0;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.connect({ uiId: this.uiId });
    }

    async send(message) {
        var messageStr = typeof message === 'string' ? message : JSON.stringify(message);

        if (this.isNative()) {
            try {
                var result = await ADBWebSocket.send({ message: messageStr });
                return result.sent;
            } catch (error) {
                return false;
            }
        } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(messageStr);
            return true;
        }

        return false;
    }

    sendSessionIdentify() {
        // Match WebSocketService format: code: 'SI', type: 'UI'
        this.send({
            code: 'SI',
            data: {
                type: 'UI',
                ui_id: this.uiId || 'UI_TIFA_001',
            }
        });
    }

    handleMessage(data) {
        var message = data;
        if (typeof data === 'string') {
            try {
                message = JSON.parse(data);
            } catch (e) {
                return;
            }
        }

        // Match WebSocketService format: emit with { type: code, data }
        var code = message.code;
        var msgData = message.data;

        switch (code) {
            case 'ACK_SOFT':
                break;

            case 'POSITION':
                this.emit('message', { type: 'POSITION', data: msgData });
                break;

            case 'BATTERY':
                this.emit('message', { type: 'BATTERY', data: msgData });
                break;

            case 'STATUS':
                this.emit('message', { type: 'STATUS', data: msgData });
                break;

            case 'GOAL_COMPLETE':
                this.emit('message', { type: 'GOAL_COMPLETE', data: msgData });
                break;

            case 'QUEUE_COMPLETED':
                this.emit('message', { type: 'QUEUE_COMPLETED', data: msgData });
                break;

            case 'ROBOT_STUCK':
                this.emit('message', { type: 'ROBOT_STUCK', data: msgData });
                break;

            case 'EMERGENCY_STOP':
                this.emit('message', { type: 'EMERGENCY_STOP', data: msgData });
                break;

            case 'ERROR':
                console.error('[ADBForward] Error from gateway:', msgData);
                this.emit('message', { type: 'ERROR', data: msgData });
                break;

            default:
                this.emit('message', { type: code, data: msgData });
        }
    }

    async testConnection() {
        var url = this.getUrl();
        console.log('[ADBForward] Testing:', url);

        if (!this.isNative()) {
            return this.testConnectionFallback();
        }

        try {
            var result = await ADBWebSocket.testConnection({ url: url });
            return result.success;
        } catch (error) {
            return false;
        }
    }

    testConnectionFallback() {
        var self = this;
        return new Promise(function (resolve) {
            var url = self.getUrl();
            try {
                var testWs = new WebSocket(url);
                var timeout = setTimeout(function () {
                    testWs.close();
                    resolve(false);
                }, 5000);

                testWs.onopen = function () {
                    clearTimeout(timeout);
                    testWs.close();
                    resolve(true);
                };

                testWs.onerror = function () {
                    clearTimeout(timeout);
                    resolve(false);
                };
            } catch (error) {
                resolve(false);
            }
        });
    }

    getIsConnected() {
        return this.isConnected;
    }

    getState() {
        return {
            isConnected: this.isConnected,
            url: this.getUrl(),
            uiId: this.uiId,
        };
    }

    sendOperation(robotId, mapId, requestedBy, trayTasks, homeBase) {
        return this.send({
            code: 'OP',
            data: {
                robot_id: robotId,
                type: 'OP',
                map_id: mapId,
                reqested_by: requestedBy,
                tray_tasks: trayTasks,
                home_base: homeBase
            }
        });
    }

    sendMove(robotId, sequence, dest, homeBase, type) {
        var data = {
            robot_id: robotId,
            sequence: sequence,
            dest: dest,
            home_base: homeBase
        };
        // Only add type if provided (matches WebSocketService)
        if (type) {
            data.type = type;
        }
        return this.send({
            code: 'MOVE',
            data: data
        });
    }

    sendMode(robotId, mode) {
        return this.send({
            code: 'MODE',
            data: {
                robot_id: robotId,
                mode: mode
            }
        });
    }

    sendPickupConfirm(robotId, sequence, uiId) {
        return this.send({
            code: 'PICKUP_CONFIRM',
            data: {
                robot_id: robotId,
                sequence: sequence,
                ui_id: uiId,
                timestamp: new Date().toISOString()
            }
        });
    }

    sendPickupCancel(robotId, sequence, uiId) {
        return this.send({
            code: 'PICKUP_CANCEL',
            data: {
                robot_id: robotId,
                sequence: sequence,
                ui_id: uiId,
                timestamp: new Date().toISOString()
            }
        });
    }

    sendInterrupt(robotId) {
        return this.send({
            code: 'INTERRUPT',
            data: {
                robot_id: robotId,
                timestamp: new Date().toISOString()
            }
        });
    }

    sendInterruptConfirm(robotId) {
        return this.send({
            code: 'INTERRUPT_CONFIRM',
            data: {
                robot_id: robotId,
                timestamp: new Date().toISOString()
            }
        });
    }

    sendInterruptCancel(robotId) {
        return this.send({
            code: 'INTERRUPT_CANCEL',
            data: {
                robot_id: robotId,
                timestamp: new Date().toISOString()
            }
        });
    }

    sendArrivalConfirm(robotId) {
        return this.send({
            code: 'ARRIVAL_CONFIRM',
            data: {
                robot_id: robotId,
                timestamp: new Date().toISOString()
            }
        });
    }

    sendArrivalCancel(robotId) {
        return this.send({
            code: 'ARRIVAL_CANCEL',
            data: {
                robot_id: robotId,
                timestamp: new Date().toISOString()
            }
        });
    }

    sendMapSelected(robotId, mapId) {
        return this.send({
            code: 'MAP_SELECTED',
            data: {
                robot_id: robotId,
                map_id: mapId,
                timestamp: new Date().toISOString()
            }
        });
    }

    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(function (cb) { return cb !== callback; });
        }
    }

    removeAllListeners(event) {
        var self = this;
        if (event && this.listeners[event]) {
            this.listeners[event] = [];
        } else {
            Object.keys(this.listeners).forEach(function (key) {
                self.listeners[key] = [];
            });
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(function (callback) { callback(data); });
        }
    }
}

var adbForwardService = new ADBForwardService();
export default adbForwardService;