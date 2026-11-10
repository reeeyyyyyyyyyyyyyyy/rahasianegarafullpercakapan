import { NextResponse } from 'next/server';
import { getBatteryHistory, getLatestBatteries, getBatteryStats, getHourlyBatteryData } from '@/lib/api/battery';
import type { BatteryBuckets } from '@/lib/types/database';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const deviceId = searchParams.get('deviceId');
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    if (action === 'history' && deviceId) {
        const result = await getBatteryHistory(parseInt(deviceId, 10), limit);
        return NextResponse.json(result);
    }

    if (action === 'hourly-battery' && deviceId) {
        const range = (searchParams.get('range') ?? '1d') as '1d' | '1w' | '1m' | '3m';
        const result = await getHourlyBatteryData(parseInt(deviceId, 10), range);
        return NextResponse.json(result);
    }

    if (action === 'stats') {
        const result = await getBatteryStats();
        return NextResponse.json(result);
    }

    // Get per-robot battery stats
    if (action === 'robot-stats' && deviceId) {
        const { data: batteryData, error } = await getBatteryHistory(parseInt(deviceId, 10), 100);

        if (error || !batteryData) {
            return NextResponse.json({
                data: { avgBattery: null, buckets: { critical: 0, warning: 0, healthy: 0 } },
                error,
            });
        }

        if (batteryData.length === 0) {
            return NextResponse.json({
                data: { avgBattery: null, buckets: { critical: 0, warning: 0, healthy: 0 } },
                error: null,
            });
        }

        const sum = batteryData.reduce(
            (acc, cur) => acc + Number(cur.battery_percent ?? 0),
            0
        );
        const avgBattery = Math.round(sum / batteryData.length);

        const buckets: BatteryBuckets = { critical: 0, warning: 0, healthy: 0 };
        batteryData.forEach((item) => {
            const value = Number(item.battery_percent ?? 0);
            if (value <= 30) buckets.critical += 1;
            else if (value <= 60) buckets.warning += 1;
            else buckets.healthy += 1;
        });

        return NextResponse.json({
            data: { avgBattery, buckets },
            error: null,
        });
    }

    const result = await getLatestBatteries(limit);
    return NextResponse.json(result);
}
