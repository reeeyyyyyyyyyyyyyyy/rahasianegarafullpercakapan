// WS Traffic API - Server-side functions for h_ws_traffic table
// Logs WebSocket lifecycle events: INIT, READY, ERROR, DISCONNECT, SI

import { query } from '@/lib/dbClient';
import type { WsTraffic, ApiResult } from '@/lib/types/database';

/**
 * Get the absolute latest WS status to determine if robot is online or offline.
 */
export async function getLatestWsStatus(deviceId: number): Promise<ApiResult<{ isOnline: boolean; lastStatus: string; recordedAt: string }>> {
    try {
        const rows = await query<WsTraffic>(
            `SELECT code, recorded_at 
             FROM h_ws_traffic 
             WHERE device_id = $1 
               AND code IN ('READY', 'DISCONNECT', 'ERROR')
             ORDER BY recorded_at DESC LIMIT 1`,
            [deviceId]
        );
        if (rows.length > 0) {
            const isOnline = rows[0].code === 'READY';
            return { data: { isOnline, lastStatus: rows[0].code, recordedAt: rows[0].recorded_at.toString() }, error: null };
        }
        return { data: { isOnline: false, lastStatus: 'UNKNOWN', recordedAt: '' }, error: null };
    } catch (err: unknown) {
        return { data: null, error: (err as Error).message };
    }
}

/**
 * Get WS traffic logs with time range and optional device filter.
 * Same range pattern as command logs (1d/1w/1m/3m).
 */
export async function getWsTrafficByRange(
    range: string = '1d',
    deviceId?: number
): Promise<ApiResult<WsTraffic[]>> {
    try {
        const now = new Date();
        let startDate: Date;
        switch (range) {
            case '1w': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
            case '1m': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
            case '3m': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
            default: startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
        }

        let sql = `SELECT h_ws_traffic_id, device_id, direction, code, NULL as payload, remote_addr, recorded_at
             FROM h_ws_traffic
             WHERE recorded_at >= $1`;
        const params: (string | number)[] = [startDate.toISOString()];

        if (deviceId !== undefined) {
            sql += ` AND device_id = $2`;
            params.push(deviceId);
        }

        // Only show meaningful codes
        sql += ` AND code IN ('INIT', 'READY', 'ERROR', 'DISCONNECT', 'MAPPING_DONE')`;
        sql += ` ORDER BY recorded_at DESC`;

        const data = await query<WsTraffic>(sql, params);
        return { data, error: null };
    } catch (err: unknown) {
        const error = err as Error;
        return { data: null, error: error.message ?? 'Database error' };
    }
}

/**
 * Get the latest WS traffic event per device.
 * Used by NotificationBell to show current connection status.
 */
export async function getLatestWsTrafficPerDevice(): Promise<ApiResult<WsTraffic[]>> {
    try {
        const data = await query<WsTraffic>(
            `SELECT DISTINCT ON (device_id)
                    h_ws_traffic_id, device_id, direction, code, payload, remote_addr, recorded_at
             FROM h_ws_traffic
             WHERE code IN ('INIT', 'READY', 'ERROR', 'DISCONNECT', 'MAPPING_DONE')
             ORDER BY device_id, recorded_at DESC`
        );
        return { data, error: null };
    } catch (err: unknown) {
        const error = err as Error;
        return { data: null, error: error.message ?? 'Database error' };
    }
}

/**
 * Get recent WS traffic logs (latest N entries).
 * Used in the dashboard Activity Log sidebar.
 */
export async function getRecentWsTraffic(
    limit: number = 10,
    deviceId?: number
): Promise<ApiResult<WsTraffic[]>> {
    try {
        let sql = `SELECT h_ws_traffic_id, device_id, direction, code, NULL as payload, remote_addr, recorded_at
             FROM h_ws_traffic
             WHERE code IN ('INIT', 'READY', 'ERROR', 'DISCONNECT', 'MAPPING_DONE')
               AND recorded_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Jakarta')`;
        const params: (string | number)[] = [];

        if (deviceId !== undefined) {
            sql += ` AND device_id = $1`;
            params.push(deviceId);
            sql += ` ORDER BY recorded_at DESC LIMIT $2`;
            params.push(limit);
        } else {
            sql += ` ORDER BY recorded_at DESC LIMIT $1`;
            params.push(limit);
        }

        const data = await query<WsTraffic>(sql, params);
        return { data, error: null };
    } catch (err: unknown) {
        const error = err as Error;
        return { data: null, error: error.message ?? 'Database error' };
    }
}
