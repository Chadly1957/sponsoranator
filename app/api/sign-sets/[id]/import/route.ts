import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse } from '@/lib/api-helpers';
import { parseSignListExcel } from '@/lib/excel';
import {
  createSignRenderCache,
  findCompanyByName,
  matchTemplateSize,
  renderSignRecord,
} from '@/lib/signGeneration';
import { saveGeneratedSignPdf, SignError } from '@/lib/signFiles';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Imports a sign list spreadsheet (Sponsorship / Company / Size columns), generating one
 *  sign PDF per row by matching each row's Size against the set's template sizes and each
 *  row's Company against the logo library. Rows that can't be fully matched are still
 *  created (so they're visible and fixable in the UI) but flagged "needs_attention". */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const signSet = await prisma.signSet.findUnique({
      where: { id: params.id },
      include: { template: { include: { sizes: true } } },
    });
    if (!signSet) return NextResponse.json({ error: 'Sign set not found.' }, { status: 404 });

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      throw new SignError('A spreadsheet file is required.');
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseSignListExcel(buffer);

    const startOrder = await prisma.sign.count({ where: { signSetId: signSet.id } });
    const created = [];
    const cache = createSignRenderCache();

    for (const [i, row] of rows.entries()) {
      const templateSize = matchTemplateSize(signSet.template.sizes, row.size);
      const company = await findCompanyByName(row.company);

      let pdfPath: string | null = null;
      let status: 'ready' | 'needs_attention' = 'ready';
      let note: string | null = null;

      if (!templateSize) {
        status = 'needs_attention';
        note = row.size
          ? `No sign size matches "${row.size}" — edit this sign to pick one.`
          : 'No size was specified for this row.';
      } else {
        const issues: string[] = [];
        if (!row.sponsorship) {
          issues.push('No sponsorship title in the sign list — edit this sign to add one.');
        }
        if (!company) {
          issues.push(`"${row.company}" isn't in the logo library — generated without a logo.`);
        }
        if (issues.length > 0) {
          status = 'needs_attention';
          note = issues.join(' ');
        }
        try {
          const rendered = await renderSignRecord({
            templateSize,
            sponsorship: row.sponsorship,
            logoPath: company?.logoPath ?? null,
            textColor: signSet.template.textColor,
            cache,
          });
          pdfPath = await saveGeneratedSignPdf(rendered, `${row.company} - ${templateSize.label}`);
        } catch {
          status = 'needs_attention';
          note = 'Could not generate this sign automatically — try editing it.';
        }
      }

      const sign = await prisma.sign.create({
        data: {
          signSetId: signSet.id,
          templateSizeId: templateSize?.id ?? null,
          companyId: company?.id ?? null,
          companyName: row.company,
          sponsorship: row.sponsorship,
          sizeLabel: row.size,
          pdfPath,
          status,
          note,
          order: startOrder + i,
        },
        include: { company: true },
      });
      created.push(sign);
    }

    return NextResponse.json({ signs: created }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
