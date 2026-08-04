import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse } from '@/lib/api-helpers';
import { SignError } from '@/lib/signFiles';

export const dynamic = 'force-dynamic';

export async function GET() {
  const templates = await prisma.signTemplate.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { sizes: true, _count: { select: { signSets: true } } },
  });
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new SignError('Template name is required.');

    const template = await prisma.signTemplate.create({ data: { name }, include: { sizes: true } });
    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
