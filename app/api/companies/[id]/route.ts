import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { errorResponse, optionalString, resolveLogoFromForm } from '@/lib/api-helpers';
import { deleteLogoFile } from '@/lib/logo';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const company = await prisma.company.findUnique({ where: { id: params.id } });
  if (!company) return NextResponse.json({ error: 'Company not found.' }, { status: 404 });
  return NextResponse.json({ company });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.company.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Company not found.' }, { status: 404 });

    const form = await req.formData();
    const name = optionalString(form, 'name');
    const newLogoPath = await resolveLogoFromForm(form);

    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        ...(name ? { name } : {}),
        ...(newLogoPath ? { logoPath: newLogoPath } : {}),
      },
    });

    if (newLogoPath && existing.logoPath && existing.logoPath !== newLogoPath) {
      await deleteLogoFile(existing.logoPath);
    }

    return NextResponse.json({ company });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.company.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Company not found.' }, { status: 404 });

    await prisma.company.delete({ where: { id: params.id } });
    await deleteLogoFile(existing.logoPath);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
