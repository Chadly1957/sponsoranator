import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse, optionalString, resolveLogoFromForm } from '@/lib/api-helpers';
import { LogoError } from '@/lib/logo';
import { TIER_ORDER } from '@/lib/tiers';

export const dynamic = 'force-dynamic';

function normalizeTier(value: string | undefined): string {
  const upper = (value ?? 'GENERAL').toUpperCase();
  return (TIER_ORDER as readonly string[]).includes(upper) ? upper : 'GENERAL';
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const event = await prisma.event.findUnique({ where: { id: params.id } });
    if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

    const form = await req.formData();
    const tier = normalizeTier(optionalString(form, 'tier'));
    const companyId = optionalString(form, 'companyId');

    let resolvedCompanyId = companyId;

    if (!resolvedCompanyId) {
      const name = optionalString(form, 'name');
      if (!name) throw new LogoError('A company name or existing company is required.');
      const url = optionalString(form, 'url');
      const logoPath = await resolveLogoFromForm(form);
      const company = await prisma.company.create({
        data: { name, logoPath: logoPath ?? null, sourceUrl: url ?? null },
      });
      resolvedCompanyId = company.id;
    }

    const maxOrder = await prisma.eventSponsor.aggregate({
      where: { eventId: params.id, tier },
      _max: { order: true },
    });

    const sponsor = await prisma.eventSponsor.upsert({
      where: { eventId_companyId: { eventId: params.id, companyId: resolvedCompanyId } },
      update: { tier },
      create: {
        eventId: params.id,
        companyId: resolvedCompanyId,
        tier,
        order: (maxOrder._max.order ?? -1) + 1,
      },
      include: { company: true },
    });

    return NextResponse.json({ sponsor }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
