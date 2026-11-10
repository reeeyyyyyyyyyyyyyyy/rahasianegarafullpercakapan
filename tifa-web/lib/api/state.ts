// State API - Abstraction layer for robot state/mode operations
// Matches h_state table from tifa_dump.sql
// Uses PostgreSQL via pg package

import { query } from '@/lib/dbClient';
import type { RobotState, RobotMode, ApiResult } from '@/lib/types/database';

/**
 * Get state history for a specific device
 */
export async function getStateHistory(deviceId: number, limit: number = 50): Promise<ApiResult<RobotState[]>> {
    try {
        const data = await query<RobotState>(
            `SELECT h_state_id, device_id, robot_mode, robot_activity, is_emergency, 
                    recorded_at, raw_payload
             FROM h_state
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
 * Get latest state for a specific device
 */
export async function getLatestState(deviceId: number): Promise<ApiResult<RobotState>> {
    try {
        const rows = await query<RobotState>(
            `SELECT h_state_id, device_id, robot_mode, robot_activity, is_emergency, 
                    recorded_at, raw_payload
             FROM h_state
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
 * Get all devices in emergency state
 */
export async function getEmergencyDevices(): Promise<ApiResult<RobotState[]>> {
    try {
        const data = await query<RobotState>(
            `SELECT h_state_id, device_id, robot_mode, robot_activity, is_emergency, 
                    recorded_at, raw_payload
             FROM h_state
             WHERE is_emergency = true
             ORDER BY recorded_at DESC`
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
 * Count devices by mode
 */
export async function countDevicesByMode(): Promise<ApiResult<Record<RobotMode, number>>> {
    try {
        // Get latest state for each device and count by mode
        const data = await query<{ robot_mode: RobotMode }>(
            `SELECT robot_mode
             FROM h_state
             ORDER BY recorded_at DESC
             LIMIT 100`
        );

        const counts: Record<RobotMode, number> = {
            IDLE: 0,
            MOVING: 0,
            CHARGING: 0,
            MAPPING: 0,
            RETURNING_HOME: 0,
            ERROR: 0,
            PAUSED: 0,
        };

        data.forEach((item) => {
            if (item.robot_mode && item.robot_mode in counts) {
                counts[item.robot_mode]++;
            }
        });

        return {
            data: counts,
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
