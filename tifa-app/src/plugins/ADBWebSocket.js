/**
 * ADB WebSocket Plugin - Native Android WebSocket for ADB Port Forwarding
 * 
 * This plugin bypasses Capacitor WebView security restrictions
 * by handling WebSocket connections at the native Android level.
 */

import { registerPlugin } from '@capacitor/core';

/**
 * @typedef {Object} ADBWebSocketPlugin
 * @property {function({url: string}): Promise<{connected: boolean, url: string}>} connect
 * @property {function(): Promise<{disconnected: boolean}>} disconnect
 * @property {function({message: string}): Promise<{sent: boolean}>} send
 * @property {function(): Promise<{connected: boolean, url: string}>} isConnected
 * @property {function({url: string}): Promise<{success: boolean, error?: string, url: string}>} testConnection
 * @property {function(string, function): Promise<{remove: function}>} addListener
 * @property {function(): Promise<void>} removeAllListeners
 */

const ADBWebSocket = registerPlugin('ADBWebSocket');

export default ADBWebSocket;
