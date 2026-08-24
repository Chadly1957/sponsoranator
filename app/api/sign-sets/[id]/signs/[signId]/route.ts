import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse } from '@/lib/api-helpers';
import { renderSignRecord } from '@/lib/signGeneration';
import { deletePdfFile, readPdfBytes, saveGeneratedSignPdf, sanitizePdfFilename, SignError } from '@/lib/signFiles';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function loadSign(signSetId: string, signId: string) {
  const sign = await prisma.sign.findUnique({
    where: { id: signId },
    include: { company: true, signSet: { include: { template: { include: { sizes: true } } } } },
  });
  if (!sign || sign.signSetId !== signSetId) return null;
  return sign;
}

/** Downloads this sign's currently-generated PDF. */
export async function GET(_req: NextRequest, { params }: { params: { id: string; signId: string } }) {
  try {
    const sign = await loadSign(params.id, params.signId);
    if (!sign) return NextResponse.json({ error: 'Sign not found.' }, { status: 404 });
    if (!sign.pdfPath) {
      return NextResponse.json({ error: 'This sign has not been generated yet.' }, { status: 400 });
    }
    const bytes = await readPdfBytes(sign.pdfPath);
    const filename = `${sanitizePdfFilename(sign.companyName)} - ${sanitizePdfFilename(sign.sizeLabel)}.pdf`;
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Edits a sign's company/size/text and regenerates its PDF. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string; signId: string } }) {
  try {
    const sign = await loadSign(params.id, params.signId);
    if (!sign) return NextResponse.json({ error: 'Sign not found.' }, { status: 404 });

    const body = await req.json().catch(() => ({}));

    let companyId = sign.companyId;
    let companyName = sign.companyName;
    if ('companyId' in body) {
      companyId = typeof body.companyId === 'string' ? body.companyId : null;
      if (companyId) {
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company) throw new SignError('That company no longer exists.');
        companyName = company.name;
      }
    }
    if (typeof body.companyName === 'string' && body.companyName.trim()) {
      companyName = body.companyName.trim();
    }

    let templateSizeId = sign.templateSizeId;
    let sizeLabel = sign.sizeLabel;
    if ('templateSizeId' in body) {
      templateSizeId = typeof body.templateSizeId === 'string' ? body.templateSizeId : null;
      if (templateSizeId) {
        const size = sign.signSet.template.sizes.find((s) => s.id === templateSizeId);
        if (!size) throw new SignError('That sign size does not belong to this template.');
        sizeLabel = size.label;
      }
    }

    const textOverride = 'textOverride' in body ? (typeof body.textOverride === 'string' ? body.textOverride : null) : sign.textOverride;
    const sponsorship = typeof body.sponsorship === 'string' ? body.sponsorship : sign.sponsorship;

    const company = companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : null;
    const templateSize = templateSizeId
      ? sign.signSet.template.sizes.find((s) => s.id === templateSizeId) ?? null
      : null;

    // On any failure the sign keeps its previous PDF — a failed regeneration must never
    // destroy the last good file.
    let pdfPath: string | null = sign.pdfPath;
    let status: 'ready' | 'needs_attention' = 'ready';
    let note: string | null = null;

    if (!templateSize) {
      status = 'needs_attention';
      note = 'No sign size selected.';
    } else {
      try {
        const rendered = await renderSignRecord({
          templateSize,
          sponsorship,
          textOverride,
          logoPath: company?.logoPath ?? null,
          textColor: sign.signSet.template.textColor,
        });
        pdfPath = await saveGeneratedSignPdf(rendered, `${companyName} - ${sizeLabel}`);
      } catch {
        status = 'needs_attention';
        note = sign.pdfPath
          ? 'Regenerating failed — the downloadable PDF is still the previous version. Try saving again.'
          : 'Could not generate this sign — try saving again.';
      }
    }

    const updated = await prisma.sign.update({
      where: { id: sign.id },
      data: {
        companyId,
        companyName,
        templateSizeId,
        sizeLabel,
        sponsorship,
        textOverride,
        pdfPath,
        status,
        note,
      },
      include: { company: true },
    });

    if (sign.pdfPath && pdfPath !== sign.pdfPath) {
      await deletePdfFile(sign.pdfPath);
    }

    return NextResponse.json({ sign: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; signId: string } }) {
  try {
    const sign = await loadSign(params.id, params.signId);
    if (!sign) return NextResponse.json({ error: 'Sign not found.' }, { status: 404 });
    await prisma.sign.delete({ where: { id: sign.id } });
    await deletePdfFile(sign.pdfPath);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
