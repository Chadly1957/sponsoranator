import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse } from '@/lib/api-helpers';
import { SignError } from '@/lib/signFiles';

export const dynamic = 'force-dynamic';

export async function GET() {
  const signSets = await prisma.signSet.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { template: true, _count: { select: { signs: true } } },
  });
  return NextResponse.json({ signSets });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const templateId = typeof body.templateId === 'string' ? body.templateId : '';
    if (!name) throw new SignError('Sign set name is required.');
    if (!templateId) throw new SignError('Choose a sign template.');

    const template = await prisma.signTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new SignError('That template no longer exists.');

    const signSet = await prisma.signSet.create({
      data: { name, templateId },
      include: { template: { include: { sizes: true } }, signs: true },
    });
    return NextResponse.json({ signSet }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
