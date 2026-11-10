// Notifications API - Abstraction layer for notification operations
// Uses PostgreSQL via pg package

import { query } from '@/lib/dbClient';
import type { CommandLog, ApiResult } from '@/lib/types/database';

// Note: Currently using h_command_log as notifications source
// This can be changed to a dedicated notifications table if needed

/**
 * Get notifications (command logs) with optional filter
 */
export async function getNotifications(filter?: string): Promise<ApiResult<CommandLog[]>> {
    try {
        let sql = `
            SELECT h_command_log_id, device_id, command_code, command_payload, 
                   status, status_message, created_at
            FROM h_command_log
        `;
        const params: (string | number)[] = [];

        if (filter === "success") {
            sql += ` WHERE status = 'success'`;
        } else if (filter === "error") {
            sql += ` WHERE status != 'success'`;
        }

        sql += ` ORDER BY created_at DESC LIMIT 50`;

        const data = await query<CommandLog>(sql, params);

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
