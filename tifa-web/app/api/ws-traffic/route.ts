import { NextResponse } from 'next/server';
import { getWsTrafficByRange, getLatestWsTrafficPerDevice, getRecentWsTraffic, getLatestWsStatus } from '@/lib/api/wsTraffic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const deviceId = searchParams.get('deviceId');

    // Latest WS traffic per device (for notification bell)
    if (action === 'latest-per-device') {
        const result = await getLatestWsTrafficPerDevice();
        return NextResponse.json(result);
    }

    // Latest absolute status for a single device (online/offline)
    if (action === 'latest-status' && deviceId) {
        const result = await getLatestWsStatus(parseInt(deviceId, 10));
        return NextResponse.json(result);
    }

    // WS traffic by time range (for activity log page)
    if (action === 'logs-by-range') {
        const range = searchParams.get('range') ?? '1d';
        const result = await getWsTrafficByRange(
            range,
            deviceId ? parseInt(deviceId, 10) : undefined
        );
        return NextResponse.json(result);
    }

    // Default: recent WS traffic
    const limit = parseInt(searchParams.get('limit') ?? '10', 10);
    const result = await getRecentWsTraffic(
        limit,
        deviceId ? parseInt(deviceId, 10) : undefined
    );
    return NextResponse.json(result);
}
