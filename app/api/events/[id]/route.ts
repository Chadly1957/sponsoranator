import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse, optionalString, optionalLogosPerRow, resolveLogoFromForm } from '@/lib/api-helpers';
import { deleteLogoFile } from '@/lib/logo';
import { tierRank } from '@/lib/tiers';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { sponsors: { include: { company: true } } },
  });
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  const sponsors = [...event.sponsors].sort((a, b) => {
    const rankDiff = tierRank(a.tier) - tierRank(b.tier);
    return rankDiff !== 0 ? rankDiff : a.order - b.order;
  });

  return NextResponse.json({ event: { ...event, sponsors } });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.event.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

    const form = await req.formData();
    const name = optionalString(form, 'name');
    const primaryColor = optionalString(form, 'primaryColor');
    const accentColor = optionalString(form, 'accentColor');
    const topTierLabel = optionalString(form, 'topTierLabel');
    const logosPerRow = optionalLogosPerRow(form);
    const newLogoPath = await resolveLogoFromForm(form);

    const event = await prisma.event.update({
      where: { id: params.id },
      data: {
        ...(name ? { name } : {}),
        ...(primaryColor ? { primaryColor } : {}),
        ...(accentColor ? { accentColor } : {}),
        ...(topTierLabel ? { topTierLabel } : {}),
        ...(logosPerRow !== undefined ? { logosPerRow } : {}),
        ...(newLogoPath ? { logoPath: newLogoPath } : {}),
      },
    });

    if (newLogoPath && existing.logoPath && existing.logoPath !== newLogoPath) {
      await deleteLogoFile(existing.logoPath);
    }

    return NextResponse.json({ event });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.event.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

    await prisma.event.delete({ where: { id: params.id } });
    await deleteLogoFile(existing.logoPath);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
