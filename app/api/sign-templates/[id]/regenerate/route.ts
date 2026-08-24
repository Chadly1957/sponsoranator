import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse } from '@/lib/api-helpers';
import { createSignRenderCache, renderSignRecord } from '@/lib/signGeneration';
import { deletePdfFile, saveGeneratedSignPdf } from '@/lib/signFiles';

export const dynamic = 'force-dynamic';
// Bulk work: rendering dozens of signs must not get cut off by the default (short)
// serverless timeout — a mid-flight kill is what leaves batches half-updated.
export const maxDuration = 60;

const PARALLEL_BATCH = 4;

/** Re-renders every already-generated sign built from this template (across every sign set
 *  using it), so a template-level change — text color, placeholder positions — is locked
 *  into signs generated before the change. Old PDFs are only deleted at the very end, after
 *  every database row points at its new file; a sign whose render fails keeps its previous
 *  PDF and stays untouched. */
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

    const cache = createSignRenderCache();
    const oldPaths: string[] = [];
    const failures: { companyName: string; sizeLabel: string }[] = [];
    let updated = 0;

    for (let i = 0; i < signs.length; i += PARALLEL_BATCH) {
      await Promise.all(
        signs.slice(i, i + PARALLEL_BATCH).map(async (sign) => {
          const templateSize = template.sizes.find((s) => s.id === sign.templateSizeId);
          if (!templateSize) return;

          try {
            const rendered = await renderSignRecord({
              templateSize,
              sponsorship: sign.sponsorship,
              textOverride: sign.textOverride,
              logoPath: sign.company?.logoPath ?? null,
              textColor: template.textColor,
              cache,
            });
            const pdfPath = await saveGeneratedSignPdf(
              rendered,
              `${sign.companyName} - ${templateSize.label}`
            );
            await prisma.sign.update({
              where: { id: sign.id },
              data: {
                pdfPath,
                status: sign.company ? 'ready' : 'needs_attention',
                note: sign.company
                  ? null
                  : `"${sign.companyName}" isn't in the logo library — generated without a logo.`,
              },
            });
            if (sign.pdfPath && sign.pdfPath !== pdfPath) oldPaths.push(sign.pdfPath);
            updated++;
          } catch {
            failures.push({ companyName: sign.companyName, sizeLabel: sign.sizeLabel });
          }
        })
      );
    }

    // All rows now reference their new PDFs — only now is it safe to drop the old files.
    await Promise.all(oldPaths.map((path) => deletePdfFile(path)));

    return NextResponse.json({ updated, failed: failures.length, total: signs.length, failures });
  } catch (err) {
    return errorResponse(err);
  }
}
