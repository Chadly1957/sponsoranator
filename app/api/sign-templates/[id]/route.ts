import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse } from '@/lib/api-helpers';
import { deletePdfFile, SignError } from '@/lib/signFiles';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const template = await prisma.signTemplate.findUnique({
    where: { id: params.id },
    include: { sizes: { orderBy: { createdAt: 'asc' } } },
  });
  if (!template) return NextResponse.json({ error: 'Template not found.' }, { status: 404 });
  return NextResponse.json({ template });
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    if (name !== undefined && !name) throw new SignError('Template name cannot be empty.');

    const textColor = typeof body.textColor === 'string' ? body.textColor.trim() : undefined;
    if (textColor !== undefined && !HEX_COLOR.test(textColor)) {
      throw new SignError('Text color must be a hex value like #0a2f5c.');
    }

    const template = await prisma.signTemplate.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(textColor !== undefined ? { textColor } : {}),
      },
      include: { sizes: true },
    });
    return NextResponse.json({ template });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const template = await prisma.signTemplate.findUnique({
      where: { id: params.id },
      include: { sizes: true, _count: { select: { signSets: true } } },
    });
    if (!template) return NextResponse.json({ error: 'Template not found.' }, { status: 404 });
    if (template._count.signSets > 0) {
      throw new SignError(
        'This template is used by one or more sign sets — delete those sign sets first.'
      );
    }

    await prisma.signTemplate.delete({ where: { id: params.id } });
    await Promise.all(template.sizes.map((size) => deletePdfFile(size.pdfPath)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
