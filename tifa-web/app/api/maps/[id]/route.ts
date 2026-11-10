import { NextResponse } from 'next/server';
import { getMapById, getMapFiles } from '@/lib/api/maps';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const idParam = await params;
        const mapId = parseInt(idParam.id, 10);
        if (isNaN(mapId)) {
            return NextResponse.json({ data: null, error: 'Invalid map ID' }, { status: 400 });
        }

        // Fetch map metadata
        const mapResult = await getMapById(mapId);
        if (mapResult.error || !mapResult.data) {
            return NextResponse.json(mapResult, { status: 404 });
        }

        // Fetch map files
        const filesResult = await getMapFiles(mapId);
        
        return NextResponse.json({
            data: {
                map: mapResult.data,
                files: filesResult.data || []
            },
            error: null
        });
    } catch (err: unknown) {
        return NextResponse.json(
            { data: null, error: err instanceof Error ? err.message : 'Server error' },
            { status: 500 }
        );
    }
}
