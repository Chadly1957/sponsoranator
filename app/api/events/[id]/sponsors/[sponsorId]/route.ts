import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { errorResponse } from '@/lib/api-helpers';
import { clampLogoScale, TIER_ORDER } from '@/lib/tiers';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; sponsorId: string } }
) {
  try {
    const body = await req.json();
    const data: { tier?: string; order?: number; scale?: number } = {};

    if (typeof body.tier === 'string') {
      const upper = body.tier.toUpperCase();
      if (!(TIER_ORDER as readonly string[]).includes(upper)) {
        return NextResponse.json({ error: 'Invalid tier.' }, { status: 400 });
      }
      data.tier = upper;
    }
    if (typeof body.order === 'number') {
      data.order = body.order;
    }
    if (typeof body.scale === 'number') {
      data.scale = clampLogoScale(body.scale);
    }

    const sponsor = await prisma.eventSponsor.update({
      where: { id: params.sponsorId, eventId: params.id },
      data,
      include: { company: true },
    });

    revalidatePath('/');
    revalidatePath(`/events/${params.id}`);

    return NextResponse.json({ sponsor });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; sponsorId: string } }
) {
  try {
    await prisma.eventSponsor.delete({ where: { id: params.sponsorId, eventId: params.id } });
    revalidatePath('/');
    revalidatePath(`/events/${params.id}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
