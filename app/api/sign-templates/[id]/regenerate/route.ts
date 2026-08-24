import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse } from '@/lib/api-helpers';
import { renderSignRecord } from '@/lib/signGeneration';
import { deletePdfFile, saveGeneratedSignPdf } from '@/lib/signFiles';

export const dynamic = 'force-dynamic';

/** Re-renders every already-generated sign built from this template (across every sign set
 *  using it), so a template-level change — currently just text color — is locked into signs
 *  that were generated before the change. Signs missing a resolved size are left untouched;
 *  their "needs attention" state is unrelated to this template edit. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const template = await prisma.signTemplate.findUnique({
      where: { id: params.id },
      include: { sizes: true },
    });
    if (!template) return NextResponse.json({ error: 'Template not found.' }, { status: 404 });

    const signs = await prisma.sign.findMany({
      where: { signSet: { templateId: template.id }, templateSizeId: { not: null } },
      include: { company: true },
    });

    let updated = 0;
    let failed = 0;

    for (const sign of signs) {
      const templateSize = template.sizes.find((s) => s.id === sign.templateSizeId);
      if (!templateSize) continue;

      try {
        const rendered = await renderSignRecord({
          templateSize,
          sponsorship: sign.sponsorship,
          textOverride: sign.textOverride,
          logoPath: sign.company?.logoPath ?? null,
          textColor: template.textColor,
        });
        const pdfPath = await saveGeneratedSignPdf(rendered);
        const previousPdfPath = sign.pdfPath;

        await prisma.sign.update({
          where: { id: sign.id },
          data: {
            pdfPath,
            status: sign.company ? 'ready' : 'needs_attention',
            note: sign.company ? null : `"${sign.companyName}" isn't in the logo library — generated without a logo.`,
          },
        });
        await deletePdfFile(previousPdfPath);
        updated++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ updated, failed, total: signs.length });
  } catch (err) {
    return errorResponse(err);
  }
}
