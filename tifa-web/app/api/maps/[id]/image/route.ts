import { NextResponse } from 'next/server';
import { getMapFileBuffer } from '@/lib/api/maps';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const idParam = await params;
        const mapId = parseInt(idParam.id, 10);
        if (isNaN(mapId)) {
            return NextResponse.json({ error: 'Invalid map ID' }, { status: 400 });
        }

        // Try getting png first, then pgm
        let fileData = await getMapFileBuffer(mapId, 'png');
        if (!fileData) {
            fileData = await getMapFileBuffer(mapId, 'pgm');
        }

        if (!fileData) {
            return NextResponse.json({ error: 'Map image file not found on server' }, { status: 404 });
        }

        // Return file as raw buffer
        // Convert Node Buffer to Uint8Array which is accepted by NextResponse
        return new NextResponse(new Uint8Array(fileData.buffer), {
            headers: {
                'Content-Type': fileData.mimeType,
                'Content-Disposition': `inline; filename="${fileData.fileName}"`,
                'Cache-Control': 'public, max-age=86400', // Cache for 1 day
            },
        });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Server error' },
            { status: 500 }
        );
    }
}
