// Activity Log API - Activity logs with sentiment classification
// For robot activities and customer interaction feedback

import { query } from '@/lib/dbClient';
import type { ActivityLog, SentimentType, ApiResult } from '@/lib/types/database';

// Simple sentiment analysis based on keywords
function analyzeSentiment(text: string | null): SentimentType {
    if (!text) return 'neutral';

    const lowerText = text.toLowerCase();

    const positiveKeywords = [
        'bagus', 'baik', 'terima kasih', 'terimakasih', 'mantap', 'keren', 'hebat',
        'sukses', 'berhasil', 'good', 'great', 'excellent', 'thanks', 'thank you',
        'perfect', 'awesome', 'nice', 'love', 'happy', 'senang', 'puas', 'suka'
    ];

    const negativeKeywords = [
        'buruk', 'jelek', 'gagal', 'error', 'rusak', 'lambat', 'salah',
        'bad', 'poor', 'fail', 'failed', 'error', 'broken', 'slow', 'wrong',
        'tidak puas', 'kecewa', 'marah', 'angry', 'disappointed', 'hate', 'benci'
    ];

    for (const keyword of positiveKeywords) {
        if (lowerText.includes(keyword)) return 'positive';
    }

    for (const keyword of negativeKeywords) {
        if (lowerText.includes(keyword)) return 'negative';
    }

    return 'neutral';
}

/**
 * Get activity logs with sentiment analysis
 * Maps from h_command_log and h_state tables
 */
export async function getActivityLogs(
    limit: number = 50,
    deviceId?: number
): Promise<ApiResult<ActivityLog[]>> {
    try {
        let sql = `
            SELECT 
                cl.h_command_log_id as id,
                cl.device_id,
                d.device_name,
                cl.command_code,
                cl.status,
                cl.status_message,
                cl.created_at
            FROM h_command_log cl
            LEFT JOIN m_device d ON cl.device_id = d.device_id
        `;
        const params: (string | number)[] = [];

        if (deviceId !== undefined) {
            sql += ` WHERE cl.device_id = $1`;
            params.push(deviceId);
            sql += ` ORDER BY cl.created_at DESC LIMIT $2`;
            params.push(limit);
        } else {
            sql += ` ORDER BY cl.created_at DESC LIMIT $1`;
            params.push(limit);
        }

        const rawData = await query<{
            id: number;
            device_id: number;
            device_name: string | null;
            command_code: string | null;
            status: string | null;
            status_message: string | null;
            created_at: string;
        }>(sql, params);

        // Transform to ActivityLog with sentiment
        const logs: ActivityLog[] = rawData.map((row) => {
            // Determine activity type based on command code
            let activityType: ActivityLog['activity_type'] = 'system';
            const code = row.command_code?.toLowerCase() || '';

            if (code.includes('deliver') || code.includes('antar') || code.includes('goto')) {
                activityType = 'delivery';
            } else if (code.includes('speak') || code.includes('voice') || code.includes('interact')) {
                activityType = 'interaction';
            } else if (code.includes('battery') || code.includes('charge')) {
                activityType = 'battery';
            } else if (row.status !== 'success') {
                activityType = 'error';
            }

            // Generate activity message
            const message = row.status_message || row.command_code || 'Unknown activity';

            // Analyze sentiment from the message
            const sentiment = analyzeSentiment(row.status_message);

            return {
                id: row.id,
                device_id: row.device_id,
                device_name: row.device_name,
                activity_type: activityType,
                message: message,
                sentiment: sentiment,
                customer_response: row.status_message,
                created_at: row.created_at,
            };
        });

        return { data: logs, error: null };
    } catch (err: unknown) {
        const error = err as Error;
        return { data: null, error: error.message ?? 'Database error' };
    }
}

/**
 * Get activity logs for a specific robot
 */
export async function getRobotActivities(
    deviceId: number,
    limit: number = 20
): Promise<ApiResult<ActivityLog[]>> {
    return getActivityLogs(limit, deviceId);
}

/**
 * Get activities filtered by sentiment
 */
export async function getActivitiesBySentiment(
    sentiment: SentimentType,
    limit: number = 50
): Promise<ApiResult<ActivityLog[]>> {
    const { data: allLogs, error } = await getActivityLogs(limit * 2);

    if (error || !allLogs) {
        return { data: null, error };
    }

    const filtered = allLogs.filter(log => log.sentiment === sentiment).slice(0, limit);
    return { data: filtered, error: null };
}
