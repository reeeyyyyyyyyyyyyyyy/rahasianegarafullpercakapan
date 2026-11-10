// Position API - Abstraction layer for robot position operations
// Matches h_position table from tifa_dump.sql
// Uses PostgreSQL via pg package

import { query } from '@/lib/dbClient';
import type { Position, ApiResult } from '@/lib/types/database';

/**
 * Get position history for a specific device
 */
export async function getPositionHistory(deviceId: number, limit: number = 100): Promise<ApiResult<Position[]>> {
    try {
        const data = await query<Position>(
            `SELECT h_position_id, device_id, x, y, yaw, recorded_at, raw_payload
             FROM h_position
             WHERE device_id = $1
             ORDER BY recorded_at DESC
             LIMIT $2`,
            [deviceId, limit]
        );

        return {
            data,
            error: null,
        };
    } catch (err: unknown) {
        const error = err as Error;
        return {
            data: null,
            error: error.message ?? 'Database error',
        };
    }
}

/**
 * Get latest position for a specific device
 */
export async function getLatestPosition(deviceId: number): Promise<ApiResult<Position>> {
    try {
        const rows = await query<Position>(
            `SELECT h_position_id, device_id, x, y, yaw, recorded_at, raw_payload
             FROM h_position
             WHERE device_id = $1
             ORDER BY recorded_at DESC
             LIMIT 1`,
            [deviceId]
        );

        return {
            data: rows[0] ?? null,
            error: null,
        };
    } catch (err: unknown) {
        const error = err as Error;
        return {
            data: null,
            error: error.message ?? 'Database error',
        };
    }
}

/**
 * Get latest positions for all devices
 */
export async function getAllLatestPositions(): Promise<ApiResult<Position[]>> {
    try {
        // Get distinct device positions (latest for each device)
        const data = await query<Position>(
            `SELECT h_position_id, device_id, x, y, yaw, recorded_at, raw_payload
             FROM h_position
             ORDER BY recorded_at DESC
             LIMIT 50`
        );

        return {
            data,
            error: null,
        };
    } catch (err: unknown) {
        const error = err as Error;
        return {
            data: null,
            error: error.message ?? 'Database error',
        };
    }
}
