"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getLatestWsTrafficPerDevice, getRobots, groupRobots } from "@/lib/api";

type ToastItem = {
    id: string;
    deviceName: string;
    code: string;
    message: string;
    timestamp: string;
};

const CODE_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; icon: React.ReactNode; label: string }> = {
    READY: {
        color: 'text-emerald-700 dark:text-emerald-400',
        bgColor: 'bg-emerald-100 dark:bg-emerald-500/10',
        borderColor: 'border-emerald-300 dark:border-emerald-500/30',
        label: 'Robot Ready',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    ERROR: {
        color: 'text-rose-700 dark:text-rose-400',
        bgColor: 'bg-rose-100 dark:bg-rose-500/10',
        borderColor: 'border-rose-300 dark:border-rose-500/30',
        label: 'Robot Error',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    DISCONNECT: {
        color: 'text-slate-700 dark:text-slate-400',
        bgColor: 'bg-slate-100 dark:bg-slate-500/10',
        borderColor: 'border-slate-300 dark:border-slate-500/30',
        label: 'Robot Disconnected',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656M6.343 6.343a8 8 0 000 11.314" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17L7 7" />
            </svg>
        ),
    },
};

export default function RobotReadyToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const seenIdsRef = useRef<Set<number>>(new Set());
    const deviceNameMapRef = useRef<Map<number, string>>(new Map());
    const isFirstLoadRef = useRef(true);

    // Load device names once
    useEffect(() => {
        const loadDeviceNames = async () => {
            const { data } = await getRobots();
            if (data) {
                const grouped = groupRobots(data);
                grouped.forEach(g => {
                    if (g.rbDevice) {
                        const id = typeof g.rbDevice.device_id === 'string' ? parseInt(g.rbDevice.device_id, 10) : g.rbDevice.device_id;
                        deviceNameMapRef.current.set(id, g.displayName);
                    }
                    if (g.uiDevice) {
                        const id = typeof g.uiDevice.device_id === 'string' ? parseInt(g.uiDevice.device_id, 10) : g.uiDevice.device_id;
                        deviceNameMapRef.current.set(id, g.displayName);
                    }
                });
            }
        };
        void loadDeviceNames();
    }, []);

    const checkForNewEvents = useCallback(async () => {
        const { data: latestEvents } = await getLatestWsTrafficPerDevice();
        if (!latestEvents) return;

        // On first load, just record seen IDs without showing toasts
        if (isFirstLoadRef.current) {
            latestEvents.forEach(evt => seenIdsRef.current.add(evt.h_ws_traffic_id));
            isFirstLoadRef.current = false;
            return;
        }

        // Filter for allowed devices (TFRB1/TIFA-001 is ID 2, RB002 is ID 13)
        const allowedDeviceIds = [2, 13];
        const newEvents = latestEvents.filter(evt => {
            const id = typeof evt.device_id === 'string' ? parseInt(evt.device_id, 10) : evt.device_id;
            
            // Determine if this is a "READY" event
            const isLegacyReady = evt.code === 'READY';
            const isInitReady = evt.code === 'INIT' && (evt.payload as any)?.status === 'READY';
            const isReadyEvent = isLegacyReady || isInitReady;
            
            const isErrorOrDisconnect = ['ERROR', 'DISCONNECT'].includes(evt.code as string);

            return !seenIdsRef.current.has(evt.h_ws_traffic_id) &&
                (isReadyEvent || isErrorOrDisconnect) && id && allowedDeviceIds.includes(id);
        });

        if (newEvents.length > 0) {
            const newToasts: ToastItem[] = newEvents.map(evt => {
                seenIdsRef.current.add(evt.h_ws_traffic_id);
                const parsedId = typeof evt.device_id === 'string' ? parseInt(evt.device_id, 10) : evt.device_id;
                const deviceName = parsedId
                    ? deviceNameMapRef.current.get(parsedId) ?? `Device #${parsedId}`
                    : 'Unknown Device';
                    
                const isReadyEvent = evt.code === 'READY' || (evt.code === 'INIT' && (evt.payload as any)?.status === 'READY');
                // Normalize code for styling
                const normalizedCode = isReadyEvent ? 'READY' : evt.code;

                return {
                    id: `ws-${evt.h_ws_traffic_id}-${Date.now()}`,
                    deviceName,
                    code: normalizedCode as string,
                    message: normalizedCode === 'READY'
                        ? `${deviceName} siap beroperasi!`
                        : normalizedCode === 'ERROR'
                            ? `${deviceName} mengalami error`
                            : `${deviceName} terputus`,
                    timestamp: evt.recorded_at,
                };
            });
            setToasts(prev => [...newToasts, ...prev].slice(0, 5));
        }

        // Update seen IDs
        latestEvents.forEach(evt => seenIdsRef.current.add(evt.h_ws_traffic_id));
    }, []);

    // Poll every 10 seconds
    useEffect(() => {
        void checkForNewEvents();
        const interval = setInterval(() => void checkForNewEvents(), 10000);
        return () => clearInterval(interval);
    }, [checkForNewEvents]);

    // Auto-dismiss toasts after 6 seconds
    useEffect(() => {
        if (toasts.length === 0) return;
        const timer = setTimeout(() => {
            setToasts(prev => prev.slice(0, -1));
        }, 6000);
        return () => clearTimeout(timer);
    }, [toasts]);

    const dismissToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-20 right-6 z-[110] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '380px' }}>
            {toasts.map((toast) => {
                const config = CODE_CONFIG[toast.code] ?? CODE_CONFIG.DISCONNECT;
                return (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto animate-in slide-in-from-right-5 fade-in duration-300 flex items-start gap-3 px-4 py-3 rounded-xl border ${config.borderColor} ${config.bgColor} backdrop-blur-xl shadow-2xl`}
                    >
                        <div className={`flex-shrink-0 mt-0.5 ${config.color}`}>
                            {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${config.color}`}>
                                {config.label}
                            </p>
                            <p className="text-xs text-txt-sec mt-0.5 truncate">
                                {toast.message}
                            </p>
                            <p className="text-[10px] text-txt-sec/60 mt-1 font-mono">
                                {new Date(toast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                        </div>
                        <button
                            onClick={() => dismissToast(toast.id)}
                            className="flex-shrink-0 p-1 rounded-lg hover:bg-white/5 text-txt-sec hover:text-txt-main transition-colors"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
