import { NextResponse } from 'next/server';
import { getStateHistory, getLatestState, getEmergencyDevices, countDevicesByMode } from '@/lib/api/state';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const deviceId = searchParams.get('deviceId');
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    if (action === 'history' && deviceId) {
        const result = await getStateHistory(parseInt(deviceId, 10), limit);
        return NextResponse.json(result);
    }

    if (action === 'latest' && deviceId) {
        const result = await getLatestState(parseInt(deviceId, 10));
        return NextResponse.json(result);
    }

    if (action === 'emergency') {
        const result = await getEmergencyDevices();
        return NextResponse.json(result);
    }

    if (action === 'count-by-mode') {
        const result = await countDevicesByMode();
        return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action or missing deviceId' }, { status: 400 });
}
