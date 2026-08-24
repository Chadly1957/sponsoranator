import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse, requireString } from '@/lib/api-helpers';
import { getPdfPageSize } from '@/lib/signPdf';
import { assertLooksLikePdf, saveTemplatePdf, SignError } from '@/lib/signFiles';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Adds a new physical size to a sign template: uploads its blank PDF and seeds starting
 *  placeholder boxes roughly centered on the page, ready to be dragged into place. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const template = await prisma.signTemplate.findUnique({ where: { id: params.id } });
    if (!template) return NextResponse.json({ error: 'Template not found.' }, { status: 404 });

    const form = await req.formData();
    const label = requireString(form, 'label');
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      throw new SignError('A PDF file is required.');
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    assertLooksLikePdf(bytes);
    const { width: pageWidth, height: pageHeight } = await getPdfPageSize(bytes);
    const pdfPath = await saveTemplatePdf(bytes);

    const logoBoxW = pageWidth * 0.5;
    const logoBoxH = pageHeight * 0.35;
    const textBoxW = pageWidth * 0.8;
    const textBoxH = pageHeight * 0.2;

    const size = await prisma.signTemplateSize.create({
      data: {
        templateId: template.id,
        label,
        pdfPath,
        pageWidth,
        pageHeight,
        logoBoxX: (pageWidth - logoBoxW) / 2,
        logoBoxY: pageHeight * 0.1,
        logoBoxW,
        logoBoxH,
        textBoxX: (pageWidth - textBoxW) / 2,
        textBoxY: pageHeight * 0.55,
        textBoxW,
        textBoxH,
      },
    });

    return NextResponse.json({ size }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
