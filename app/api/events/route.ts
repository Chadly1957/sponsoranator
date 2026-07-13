import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  errorResponse,
  requireString,
  optionalString,
  optionalLogosPerRow,
  optionalGeneralScale,
  resolveLogoFromForm,
} from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { sponsors: true } } },
  });
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const name = requireString(form, 'name');
    const primaryColor = optionalString(form, 'primaryColor') ?? '#0a2f5c';
    const accentColor = optionalString(form, 'accentColor') ?? '#e8384f';
    const topTierLabel = optionalString(form, 'topTierLabel') ?? 'Presenting Sponsors';
    const logosPerRow = optionalLogosPerRow(form) ?? 4;
    const generalScale = optionalGeneralScale(form) ?? 1.2;
    const logoPath = await resolveLogoFromForm(form);

    const event = await prisma.event.create({
      data: {
        name,
        primaryColor,
        accentColor,
        topTierLabel,
        logosPerRow,
        generalScale,
        logoPath: logoPath ?? null,
      },
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
