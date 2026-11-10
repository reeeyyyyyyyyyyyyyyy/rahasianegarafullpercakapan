import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const { manualConnectWs } = await import('@/lib/wsClient');
        await manualConnectWs();
        return NextResponse.json({ success: true, message: 'WebSocket connection triggered' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
