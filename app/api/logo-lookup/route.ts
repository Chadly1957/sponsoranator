import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-helpers';
import { findLogoUrlForCompany, LogoError } from '@/lib/logo';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new LogoError('A company name is required.');

    const url = await findLogoUrlForCompany(name);
    return NextResponse.json({ url });
  } catch (err) {
    return errorResponse(err);
  }
}
