import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse, requireString, resolveLogoFromForm } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  const companies = await prisma.company.findMany({
    where: q ? { name: { contains: q } } : undefined,
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ companies });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const name = requireString(form, 'name');
    const url = typeof form.get('url') === 'string' ? (form.get('url') as string).trim() : undefined;
    const logoPath = await resolveLogoFromForm(form);

    const company = await prisma.company.create({
      data: { name, logoPath: logoPath ?? null, sourceUrl: url || null },
    });
    return NextResponse.json({ company }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
