import { NextResponse } from 'next/server';
import { generateEventPng } from '@/lib/eventImage';
import { errorResponse } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * Same image as /api/events/[id]/image, but at a URL that ends in a literal ".png".
 * Some third-party tools (Constant Contact, notably) validate "insert image from URL"
 * by checking the URL's file extension rather than fetching and checking the actual
 * content type, and reject anything that doesn't look like an image file. The
 * `filename` segment itself is cosmetic — any value works as long as it ends in .png —
 * only `id` is used to look up the event.
 */
export async function GET(_req: Request, { params }: { params: { id: string; filename: string } }) {
  try {
    const result = await generateEventPng(params.id);
    if (!result) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

    return new NextResponse(new Uint8Array(result.png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
