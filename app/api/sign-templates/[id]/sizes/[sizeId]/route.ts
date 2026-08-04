import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse, requireString } from '@/lib/api-helpers';
import { getPdfPageSize } from '@/lib/signPdf';
import { assertLooksLikePdf, deletePdfFile, saveTemplatePdf, SignError } from '@/lib/signFiles';

export const dynamic = 'force-dynamic';

function clampBox(
  box: { x: number; y: number; w: number; h: number },
  pageWidth: number,
  pageHeight: number
) {
  const w = Math.max(1, Math.min(box.w, pageWidth));
  const h = Math.max(1, Math.min(box.h, pageHeight));
  const x = Math.max(0, Math.min(box.x, pageWidth - w));
  const y = Math.max(0, Math.min(box.y, pageHeight - h));
  return { x, y, w, h };
}

function numberField(body: Record<string, unknown>, key: string): number | undefined {
  const value = body[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; sizeId: string } }
) {
  try {
    const size = await prisma.signTemplateSize.findUnique({ where: { id: params.sizeId } });
    if (!size || size.templateId !== params.id) {
      return NextResponse.json({ error: 'Sign size not found.' }, { status: 404 });
    }

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      // Replacing the PDF file — page dimensions may change, so boxes are re-seeded.
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File) || file.size === 0) {
        throw new SignError('A PDF file is required.');
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      assertLooksLikePdf(bytes);
      const { width: pageWidth, height: pageHeight } = await getPdfPageSize(bytes);
      const pdfPath = await saveTemplatePdf(bytes);
      await deletePdfFile(size.pdfPath);

      const updated = await prisma.signTemplateSize.update({
        where: { id: size.id },
        data: {
          pdfPath,
          pageWidth,
          pageHeight,
          ...clampBoxFields('text', clampBox(
            { x: size.textBoxX, y: size.textBoxY, w: size.textBoxW, h: size.textBoxH },
            pageWidth,
            pageHeight
          )),
          ...clampBoxFields('logo', clampBox(
            { x: size.logoBoxX, y: size.logoBoxY, w: size.logoBoxW, h: size.logoBoxH },
            pageWidth,
            pageHeight
          )),
        },
      });
      return NextResponse.json({ size: updated });
    }

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};

    if (typeof body.label === 'string' && body.label.trim()) data.label = body.label.trim();

    const textBox = {
      x: numberField(body, 'textBoxX') ?? size.textBoxX,
      y: numberField(body, 'textBoxY') ?? size.textBoxY,
      w: numberField(body, 'textBoxW') ?? size.textBoxW,
      h: numberField(body, 'textBoxH') ?? size.textBoxH,
    };
    const logoBox = {
      x: numberField(body, 'logoBoxX') ?? size.logoBoxX,
      y: numberField(body, 'logoBoxY') ?? size.logoBoxY,
      w: numberField(body, 'logoBoxW') ?? size.logoBoxW,
      h: numberField(body, 'logoBoxH') ?? size.logoBoxH,
    };
    Object.assign(data, clampBoxFields('text', clampBox(textBox, size.pageWidth, size.pageHeight)));
    Object.assign(data, clampBoxFields('logo', clampBox(logoBox, size.pageWidth, size.pageHeight)));

    const updated = await prisma.signTemplateSize.update({ where: { id: size.id }, data });
    return NextResponse.json({ size: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

function clampBoxFields(prefix: 'text' | 'logo', box: { x: number; y: number; w: number; h: number }) {
  return {
    [`${prefix}BoxX`]: box.x,
    [`${prefix}BoxY`]: box.y,
    [`${prefix}BoxW`]: box.w,
    [`${prefix}BoxH`]: box.h,
  };
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; sizeId: string } }
) {
  try {
    const size = await prisma.signTemplateSize.findUnique({ where: { id: params.sizeId } });
    if (!size || size.templateId !== params.id) {
      return NextResponse.json({ error: 'Sign size not found.' }, { status: 404 });
    }
    await prisma.signTemplateSize.delete({ where: { id: size.id } });
    await deletePdfFile(size.pdfPath);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
