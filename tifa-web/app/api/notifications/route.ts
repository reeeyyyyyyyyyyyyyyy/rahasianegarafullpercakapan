import { NextResponse } from 'next/server';
import { getNotifications } from '@/lib/api/notifications';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') ?? undefined;

    const result = await getNotifications(filter);
    return NextResponse.json(result);
}
