import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse } from '@/lib/api-helpers';
import { renderSignRecord } from '@/lib/signGeneration';
import { saveGeneratedSignPdf, SignError } from '@/lib/signFiles';

export const dynamic = 'force-dynamic';

/** Adds a single sign to a sign set by hand (company + sponsorship title + size), generating
 *  its PDF immediately — the same pipeline the spreadsheet import uses, for one row at a time. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const signSet = await prisma.signSet.findUnique({
      where: { id: params.id },
      include: { template: { include: { sizes: true } } },
    });
    if (!signSet) return NextResponse.json({ error: 'Sign set not found.' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const companyId = typeof body.companyId === 'string' ? body.companyId : null;
    const sponsorship = typeof body.sponsorship === 'string' ? body.sponsorship.trim() : '';
    const templateSizeId = typeof body.templateSizeId === 'string' ? body.templateSizeId : '';
    let companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';

    if (!sponsorship) throw new SignError('Sponsorship title is required.');
    if (!templateSizeId) throw new SignError('Choose a sign size.');

    const templateSize = signSet.template.sizes.find((s) => s.id === templateSizeId);
    if (!templateSize) throw new SignError('That sign size does not belong to this template.');

    const company = companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : null;
    if (companyId && !company) throw new SignError('That company no longer exists.');
    if (company) companyName = company.name;
    if (!companyName) throw new SignError('Company name is required.');

    let pdfPath: string | null = null;
    let status: 'ready' | 'needs_attention' = 'ready';
    let note: string | null = null;
    if (!company) {
      status = 'needs_attention';
      note = `"${companyName}" isn't in the logo library — generated without a logo.`;
    }
    try {
      const rendered = await renderSignRecord({
        templateSize,
        sponsorship,
        logoPath: company?.logoPath ?? null,
        textColor: signSet.template.textColor,
      });
      pdfPath = await saveGeneratedSignPdf(rendered);
    } catch {
      status = 'needs_attention';
      note = 'Could not generate this sign automatically — try editing it.';
    }

    const order = await prisma.sign.count({ where: { signSetId: signSet.id } });
    const sign = await prisma.sign.create({
      data: {
        signSetId: signSet.id,
        templateSizeId: templateSize.id,
        companyId: company?.id ?? null,
        companyName,
        sponsorship,
        sizeLabel: templateSize.label,
        pdfPath,
        status,
        note,
        order,
      },
      include: { company: true },
    });

    return NextResponse.json({ sign }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
