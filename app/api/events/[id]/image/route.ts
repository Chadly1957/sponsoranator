import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { renderEventImage } from '@/lib/render';
import { errorResponse } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: { sponsors: { include: { company: true } } },
    });
    if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

    const png = await renderEventImage(
      {
        name: event.name,
        logoPath: event.logoPath,
        primaryColor: event.primaryColor,
        accentColor: event.accentColor,
        topTierLabel: event.topTierLabel,
        logosPerRow: event.logosPerRow,
        generalScale: event.generalScale,
        showTierLabels: event.showTierLabels,
      },
      event.sponsors.map((s) => ({
        id: s.id,
        companyName: s.company.name,
        logoPath: s.company.logoPath,
        tier: s.tier,
        order: s.order,
      }))
    );

    const download = req.nextUrl.searchParams.get('download') === '1';
    const filenameSafe = event.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'event';

    return new NextResponse(new Uint8Array(png), {
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
