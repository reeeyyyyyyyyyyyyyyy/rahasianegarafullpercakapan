import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const externalApiUrl = 'https://tifa-be.forgixrobotic.com/api/maps/upload/full';

        const response = await fetch(externalApiUrl, {
            method: 'POST',
            body: formData, // the same FormData that was received from the client
        });

        // The external API might not return JSON, so we check carefully
        let responseData;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            responseData = await response.text();
        }

        if (!response.ok) {
            console.error('Map upload external API failed:', response.status, responseData);
            return NextResponse.json(
                { data: null, error: typeof responseData === 'string' ? responseData : (responseData.message || 'Failed to upload map to server') },
                { status: response.status }
            );
        }

        return NextResponse.json({ data: responseData, error: null });

    } catch (err: unknown) {
        console.error('Error proxying map upload:', err);
        const error = err as Error;
        return NextResponse.json(
            { data: null, error: error.message ?? 'Server error' },
            { status: 500 }
        );
    }
}
