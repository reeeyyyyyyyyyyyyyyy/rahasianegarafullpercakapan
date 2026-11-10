import { NextResponse } from 'next/server';
import { insertHeartbeat } from '@/lib/api/deviceStatus';

/**
 * POST /api/device-status/heartbeat
 * 
 * Called by the robot when it turns on or periodically to report its status.
 * This triggers the robot to appear as ONLINE on the dashboard.
 * 
 * Request body:
 * {
 *   "device_code": "TFUI1",        // required - device code
 *   "robot_mode": "IDLE",          // optional - default "IDLE"
 *   "robot_activity": "startup",   // optional - default "heartbeat"
 *   "battery_percent": 85,         // optional - if provided, also updates battery
 *   "voltage": 12.6               // optional - battery voltage
 * }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate required field
        if (!body.device_code || typeof body.device_code !== 'string') {
            return NextResponse.json(
                { data: null, error: 'device_code is required and must be a string' },
                { status: 400 }
            );
        }

        const result = await insertHeartbeat({
            device_code: body.device_code,
            robot_mode: body.robot_mode,
            robot_activity: body.robot_activity,
            battery_percent: body.battery_percent,
            voltage: body.voltage,
        });

        if (result.error) {
            const statusCode = result.error.includes('not found') ? 404 : 500;
            return NextResponse.json(result, { status: statusCode });
        }

        return NextResponse.json(result);
    } catch (err: unknown) {
        const error = err as Error;
        return NextResponse.json(
            { data: null, error: error.message ?? 'Internal server error' },
            { status: 500 }
        );
    }
}
