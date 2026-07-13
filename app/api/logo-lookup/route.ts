import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-helpers';
import {
  extractDomain,
  findLogoUrlForCompany,
  findLogoUrlForDomain,
  guessNameFromUrl,
  looksLikeWebsite,
  LogoError,
} from '@/lib/logo';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (!query) throw new LogoError('A company name or website is required.');

    if (looksLikeWebsite(query)) {
      const domain = extractDomain(query);
      if (!domain) throw new LogoError("That doesn't look like a valid website.");
      const url = await findLogoUrlForDomain(domain);
      const suggestedName = guessNameFromUrl(`https://${domain}`);
      return NextResponse.json({ url, suggestedName: suggestedName || null });
    }

    const url = await findLogoUrlForCompany(query);
    return NextResponse.json({ url, suggestedName: null });
  } catch (err) {
    return errorResponse(err);
  }
}
