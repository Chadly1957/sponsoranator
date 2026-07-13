import { NextRequest, NextResponse } from 'next/server';
import { generateEventPng, slugifyFilename } from '@/lib/eventImage';
import { errorResponse } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await generateEventPng(params.id);
    if (!result) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

    const download = req.nextUrl.searchParams.get('download') === '1';
    const filenameSafe = slugifyFilename(result.eventName);

    return new NextResponse(new Uint8Array(result.png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
        ...(download
          ? { 'Content-Disposition': `attachment; filename="${filenameSafe}-sponsors.png"` }
          : {}),
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
