import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse } from '@/lib/api-helpers';
import { deletePdfFile } from '@/lib/signFiles';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const signSet = await prisma.signSet.findUnique({
    where: { id: params.id },
    include: {
      template: { include: { sizes: true } },
      signs: { include: { company: true }, orderBy: { order: 'asc' } },
    },
  });
  if (!signSet) return NextResponse.json({ error: 'Sign set not found.' }, { status: 404 });
  return NextResponse.json({ signSet });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const signSet = await prisma.signSet.findUnique({
      where: { id: params.id },
      include: { signs: true },
    });
    if (!signSet) return NextResponse.json({ error: 'Sign set not found.' }, { status: 404 });

    await prisma.signSet.delete({ where: { id: params.id } });
    await Promise.all(signSet.signs.map((sign) => deletePdfFile(sign.pdfPath)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
