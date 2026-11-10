import React, { useState, useEffect } from "react";
import { useSettingsStore } from "../../store/settingsStore";
import { useWebSocketStore } from "../../store/websocketStore";
import { useUIStore } from "../../store/uiStore";
import { clamp } from "../../hooks/useResponsive";
import commManager, { COMM_MODE } from "../../services/CommunicationManager";

export const CommunicationSettings = () => {
    const { settings, loadSettings, setSetting } = useSettingsStore();
    
    // Use individual selectors for proper reactivity
    const isConnected = useWebSocketStore(state => state.isConnected);
    const wsConnected = useWebSocketStore(state => state.wsConnected);
    const adbConnected = useWebSocketStore(state => state.adbConnected);
    const reconnect = useWebSocketStore(state => state.reconnect);
    const disconnect = useWebSocketStore(state => state.disconnect);
    const connect = useWebSocketStore(state => state.connect);
    const refreshStatus = useWebSocketStore(state => state.refreshStatus);
    
    const { addToast } = useUIStore();

    // Communication mode
    const [commMode, setCommMode] = useState(COMM_MODE.WEBSOCKET);

    // WebSocket settings
    const [wsUrl, setWsUrl] = useState('');
    const [uiId, setUiId] = useState('');
    const [robotId, setRobotId] = useState('');
    const [mapId, setMapId] = useState('');

    // ADB Forward settings
    const [adbPort, setAdbPort] = useState(12345);
    const [isADBAvailable, setIsADBAvailable] = useState(false);

    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    // Load settings on mount
    useEffect(() => {
        loadSettings();
        initializeCommManager();
        // Refresh status when page mounts
        refreshStatus();
    }, [loadSettings]);

    const initializeCommManager = async () => {
        await commManager.initialize();
        setCommMode(commManager.getMode());
        setIsADBAvailable(commManager.isADBAvailable());

        // Load ADB config
        const adbConfig = commManager.getADBConfig();
        if (adbConfig) {
            setAdbPort(adbConfig.port || 3001);
        }
    };

    // Update form when settings load
    useEffect(() => {
        if (settings) {
            setWsUrl(settings.ws_url || '');
            setUiId(settings.ui_id || '');
            setRobotId(settings.robot_id || '');
            setMapId(settings.map_id || '');
        }
    }, [settings]);

    const handleModeChange = async (mode) => {
        setCommMode(mode);
        await commManager.setMode(mode);

        addToast({
            type: 'info',
            message: `📡 Switched to ${mode === COMM_MODE.ADB_FORWARD ? 'ADB Forward' : 'WebSocket'} mode`
        });
    };

    const handleSave = async () => {
        // Validation
        if (commMode === COMM_MODE.WEBSOCKET && (!wsUrl || !uiId || !robotId || !mapId)) {
            addToast({
                type: 'error',
                message: 'All WebSocket fields are required'
            });
            return;
        }

        setSaving(true);

        try {
            // Save WebSocket settings
            await setSetting('ws_url', wsUrl, 'string');
            await setSetting('ui_id', uiId, 'string');
            await setSetting('robot_id', robotId, 'string');
            await setSetting('map_id', mapId, 'number');

            // Save ADB Forward config
            await commManager.setADBConfig({
                port: parseInt(adbPort),
                uiId,
                robotId,
                mapId: parseInt(mapId),
            });

            addToast({
                type: 'success',
                message: '✅ Settings saved successfully!'
            });

            // Refresh status to get latest connection state
            refreshStatus();

            // Reconnect if already connected to apply new settings
            if (isConnected) {
                reconnect();
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            addToast({
                type: 'error',
                message: '❌ Failed to save settings'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);

        try {
            if (commMode === COMM_MODE.ADB_FORWARD) {
                // Test ADB Forward connection
                const result = await commManager.testConnection();

                if (result === true || result?.success === true) {
                    addToast({
                        type: 'success',
                        message: `✅ ADB Forward connection successful!`
                    });
                    // Refresh status after successful test
                    refreshStatus();
                } else {
                    addToast({
                        type: 'warning',
                        message: '⚠️ ADB Forward connection failed. Make sure ADB port forwarding is active.'
                    });
                }
            } else {
                // Test WebSocket connection
                await connect();
                addToast({
                    type: 'info',
                    message: '🔗 Connecting to WebSocket...'
                });
                // Status will be updated via event listeners
            }
        } catch (error) {
            addToast({
                type: 'error',
                message: `❌ Connection test failed: ${error.message}`
            });
        } finally {
            setTesting(false);
            // Always refresh status after test
            setTimeout(() => refreshStatus(), 500);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-md">
            <h2 className="font-semibold text-gray-800 mb-6"
                style={{ fontSize: clamp(18, 2, 26) }}>
                Communication Settings
            </h2>

            {/* Communication Mode Selection */}
            <div className="mb-6">
                <label className="block font-medium mb-3 text-gray-700"
                    style={{ fontSize: clamp(14, 1.5, 18) }}>
                    Communication Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => handleModeChange(COMM_MODE.WEBSOCKET)}
                        className={`p-4 rounded-xl border-2 transition-all ${commMode === COMM_MODE.WEBSOCKET
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-gray-50 text-gray-600'
                            }`}
                    >
                        <div className="text-2xl mb-1">🌐</div>
                        <div className="font-medium" style={{ fontSize: clamp(12, 1.3, 16) }}>WebSocket</div>
                        <div className="text-xs text-gray-500">WiFi/Network</div>
                    </button>

                    <button
                        onClick={() => handleModeChange(COMM_MODE.ADB_FORWARD)}
                        disabled={!isADBAvailable}
                        className={`p-4 rounded-xl border-2 transition-all ${commMode === COMM_MODE.ADB_FORWARD
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-gray-200 bg-gray-50 text-gray-600'
                            } ${!isADBAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="text-2xl mb-1">�</div>
                        <div className="font-medium" style={{ fontSize: clamp(12, 1.3, 16) }}>ADB Forward</div>
                        <div className="text-xs text-gray-500">
                            {isADBAvailable ? 'USB via ADB' : 'Not Available'}
                        </div>
                    </button>
                </div>
            </div>

            {/* WebSocket Settings */}
            {commMode === COMM_MODE.WEBSOCKET && (
                <div className="space-y-4 mb-6 p-4 bg-blue-50 rounded-xl">
                    <h3 className="font-medium text-blue-700" style={{ fontSize: clamp(14, 1.5, 18) }}>
                        🌐 WebSocket Configuration
                    </h3>

                    <div>
                        <label className="block text-sm text-gray-600 mb-1">WebSocket URL</label>
                        <input
                            type="text"
                            value={wsUrl}
                            onChange={(e) => setWsUrl(e.target.value)}
                            placeholder="ws://192.168.1.100:3001"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{ fontSize: clamp(14, 1.5, 18) }}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-600 mb-1">UI Client ID</label>
                        <input
                            type="text"
                            value={uiId}
                            onChange={(e) => setUiId(e.target.value)}
                            placeholder="UI_TIFA_001"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{ fontSize: clamp(14, 1.5, 18) }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Robot ID</label>
                            <input
                                type="text"
                                value={robotId}
                                onChange={(e) => setRobotId(e.target.value)}
                                placeholder="RB001"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={{ fontSize: clamp(14, 1.5, 18) }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Map ID</label>
                            <input
                                type="number"
                                value={mapId}
                                onChange={(e) => setMapId(e.target.value)}
                                placeholder="1"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={{ fontSize: clamp(14, 1.5, 18) }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ADB Forward Settings */}
            {commMode === COMM_MODE.ADB_FORWARD && (
                <div className="space-y-4 mb-6 p-4 bg-green-50 rounded-xl">
                    <h3 className="font-medium text-green-700" style={{ fontSize: clamp(14, 1.5, 18) }}>
                        � ADB Port Forward Configuration
                    </h3>

                    {/* ADB Setup Instructions */}
                    <div className="p-3 bg-white rounded-lg border border-green-200">
                        <p className="text-sm text-gray-600 mb-2">
                            <strong>Setup Instructions:</strong>
                        </p>
                        <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                            <li>Connect Android device via USB</li>
                            <li>Enable USB debugging on Android</li>
                            <li>Run on host: <code className="bg-gray-100 px-1 rounded">adb forward tcp:12345 tcp:12345</code></li>
                            <li>Start WebSocket server on port 12345</li>
                        </ol>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">ADB Forward Port</label>
                            <input
                                type="number"
                                value={adbPort}
                                onChange={(e) => setAdbPort(e.target.value)}
                                placeholder="12345"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                style={{ fontSize: clamp(14, 1.5, 18) }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Robot ID</label>
                            <input
                                type="text"
                                value={robotId}
                                onChange={(e) => setRobotId(e.target.value)}
                                placeholder="RB001"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                style={{ fontSize: clamp(14, 1.5, 18) }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">UI Client ID</label>
                            <input
                                type="text"
                                value={uiId}
                                onChange={(e) => setUiId(e.target.value)}
                                placeholder="UI_TIFA_001"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                style={{ fontSize: clamp(14, 1.5, 18) }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Map ID</label>
                            <input
                                type="number"
                                value={mapId}
                                onChange={(e) => setMapId(e.target.value)}
                                placeholder="1"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                style={{ fontSize: clamp(14, 1.5, 18) }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Connection Status */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700" style={{ fontSize: clamp(14, 1.5, 18) }}>
                        Connection Status:
                    </span>
                    <span className={`font-semibold ${isConnected ? 'text-green-600' : 'text-red-600'}`}
                        style={{ fontSize: clamp(14, 1.5, 18) }}>
                        {isConnected ? '✓ Connected' : '✗ Disconnected'}
                    </span>
                </div>
                
                {/* Detailed connection status */}
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-blue-500' : 'bg-gray-300'}`} />
                        <span className={wsConnected ? 'text-blue-600' : 'text-gray-400'}>
                            WS {wsConnected ? '✓' : '✗'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${adbConnected ? 'bg-purple-500' : 'bg-gray-300'}`} />
                        <span className={adbConnected ? 'text-purple-600' : 'text-gray-400'}>
                            ADB {adbConnected ? '✓' : '✗'}
                        </span>
                    </div>
                </div>
                
                <div className="mt-2 text-sm text-gray-500">
                    Primary Mode: {commMode === COMM_MODE.ADB_FORWARD ? '📱 ADB Forward' : '🌐 WebSocket'}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg disabled:opacity-50 transition-colors"
                    style={{ fontSize: clamp(14, 1.6, 18) }}
                >
                    {testing ? '⏳ Testing...' : '🔗 Test Connection'}
                </button>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
                    style={{ fontSize: clamp(14, 1.6, 18) }}
                >
                    {saving ? 'Saving...' : '💾 Save Settings'}
                </button>
            </div>
        </div>
    );
};
