import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { fetchImageFromUrl, LogoError } from '@/lib/logo';

export const dynamic = 'force-dynamic';

const FORMAT_CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

/**
 * Fetches an image URL server-side and re-serves it from our own origin. The crop tool
 * needs same-origin pixels to read a canvas back out — hot-linking a third-party URL (or
 * even our own Blob storage domain) directly into <img> would taint the canvas the moment
 * the user tries to export their crop, regardless of that source's own CORS headers.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url.' }, { status: 400 });

  try {
    const buffer = await fetchImageFromUrl(url);
    const format = (await sharp(buffer).metadata()).format;
    const contentType = (format && FORMAT_CONTENT_TYPES[format]) || 'application/octet-stream';

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    if (err instanceof LogoError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Could not load that image.' }, { status: 502 });
  }
}
