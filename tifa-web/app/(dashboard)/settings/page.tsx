"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { getSessionUiId } from "@/lib/sessionId";

export default function SettingsPage() {
    const { dict } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [wsUrl, setWsUrl] = useState("wss://tifa-ws.forgixrobotic.com");
    const [uiId, setUiId] = useState("TFWB1");
    const [sessionUiId, setSessionUiId] = useState("");
    const [robotId, setRobotId] = useState("TFRB1");
    const [mapId, setMapId] = useState("50");

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data.success && data.settings) {
                    setWsUrl(data.settings.wsUrl);
                    setUiId(data.settings.uiId);
                    setRobotId(data.settings.robotId);
                    setMapId(data.settings.mapId);
                }
            } catch (err) {
                console.error("Failed to load settings", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
        // Load session-specific UI Client ID
        setSessionUiId(getSessionUiId());
    }, []);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wsUrl, uiId, robotId, mapId })
            });
            const data = await res.json();
            if (data.success) {
                setToast({ type: "success", message: "Settings saved successfully" });
            } else {
                setToast({ type: "error", message: data.error || "Failed to save settings" });
            }
        } catch (err: any) {
            setToast({ type: "error", message: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        // Save first just in case
        await handleSave();

        try {
            const res = await fetch('/api/ws/connect', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setToast({ type: "success", message: "WebSocket connection triggered successfully!" });
            } else {
                setToast({ type: "error", message: data.error || "Failed to connect" });
            }
        } catch (err: any) {
            setToast({ type: "error", message: err.message });
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-txt-accent"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            {toast && (
                <div className={`fixed top-20 right-6 z-[110] px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2 ${toast.type === "success"
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                    : "bg-rose-100 text-rose-700 border border-rose-300"
                    }`}>
                    {toast.message}
                </div>
            )}

            <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-txt-main/5 flex items-center justify-center border border-border-base">
                    <svg className="w-5 h-5 text-txt-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-xl font-bold text-txt-main">Communication Settings</h1>
                    <p className="text-sm text-txt-sec">Configure connection to the robot and WebSocket server</p>
                </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-border-base bg-card">
                <h2 className="text-sm font-semibold text-txt-main mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full bg-txt-accent block"></span>
                    Communication Mode
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-accent bg-accent/5 text-accent cursor-pointer transition-all hover:bg-accent/10">
                        <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <h3 className="font-semibold text-lg">WebSocket</h3>
                        <p className="text-xs opacity-70">WiFi/Network</p>
                    </div>

                    <div className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-border-base bg-elevated/50 text-txt-sec cursor-not-allowed opacity-50">
                        <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="font-semibold text-lg">ADB Forward</h3>
                        <p className="text-xs opacity-70">USB via ADB (Tablet Only)</p>
                    </div>
                </div>

                <div className="bg-accent/5 border border-accent/20 rounded-xl p-5 mb-6">
                    <h3 className="text-sm font-semibold text-accent flex items-center gap-2 mb-4">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        WebSocket Configuration
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-txt-sec mb-1">WebSocket URL</label>
                            <input
                                type="text"
                                value={wsUrl}
                                onChange={(e) => setWsUrl(e.target.value)}
                                className="input-field font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-txt-sec mb-1">WS Session ID <span className="text-[10px] text-txt-sec/50">(server-level)</span></label>
                            <input
                                type="text"
                                value={uiId}
                                onChange={(e) => setUiId(e.target.value)}
                                className="input-field font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-txt-sec mb-1">
                                UI Client ID
                                <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">ACTIVE</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={sessionUiId}
                                    readOnly
                                    className="input-field font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-elevated/50 cursor-default"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-txt-sec/50">per-session, auto-generated</span>
                            </div>
                            <p className="text-[10px] text-txt-sec/60 mt-1">Unique per user account + browser tab. Regenerated on every login.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-txt-sec mb-1">Robot ID</label>
                                <input
                                    type="text"
                                    value={robotId}
                                    onChange={(e) => setRobotId(e.target.value)}
                                    className="input-field font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-txt-sec mb-1">Map ID</label>
                                <input
                                    type="text"
                                    value={mapId}
                                    onChange={(e) => setMapId(e.target.value)}
                                    className="input-field font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-border-base gap-4">
                    <div>
                        <h4 className="text-sm font-semibold text-txt-main mb-1">Connection Status:</h4>
                        <div className="flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1 text-blue-500">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                WS ✓
                            </span>
                            <span className="flex items-center gap-1 text-txt-sec">
                                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                ADB ✗
                            </span>
                        </div>
                        <p className="text-[10px] text-txt-sec mt-1">Primary Mode: <span className="text-blue-500">WebSocket</span></p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleTestConnection}
                            disabled={testing}
                            className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {testing ? (
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            )}
                            Test Connection
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                            )}
                            Save Settings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
