import { NextResponse } from 'next/server';
import { getPositionHistory, getLatestPosition, getAllLatestPositions } from '@/lib/api/position';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const deviceId = searchParams.get('deviceId');
    const limit = parseInt(searchParams.get('limit') ?? '100', 10);

    if (action === 'history' && deviceId) {
        const result = await getPositionHistory(parseInt(deviceId, 10), limit);
        return NextResponse.json(result);
    }

    if (action === 'latest' && deviceId) {
        const result = await getLatestPosition(parseInt(deviceId, 10));
        return NextResponse.json(result);
    }

    if (action === 'all-latest') {
        const result = await getAllLatestPositions();
        return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action or missing deviceId' }, { status: 400 });
}
