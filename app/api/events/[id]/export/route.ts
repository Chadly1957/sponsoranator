import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { prisma } from '@/lib/db';
import { errorResponse } from '@/lib/api-helpers';
import { readLogoBytes, sanitizeFilename } from '@/lib/files';
import { slugifyFilename } from '@/lib/eventImage';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: { sponsors: { include: { company: true } } },
    });
    if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

    const zip = new JSZip();
    const usedNames = new Set<string>();

    for (const sponsor of event.sponsors) {
      if (!sponsor.company.logoPath) continue;
      try {
        const buffer = await readLogoBytes(sponsor.company.logoPath);
        let base = sanitizeFilename(sponsor.company.name);
        let filename = `${base}.png`;
        let n = 2;
        while (usedNames.has(filename)) {
          filename = `${base} (${n}).png`;
          n++;
        }
        usedNames.add(filename);
        zip.file(filename, buffer);
      } catch {
        // skip logos that fail to read
      }
    }

    const content = await zip.generateAsync({ type: 'nodebuffer' });
    const filenameSafe = slugifyFilename(event.name);

    return new NextResponse(new Uint8Array(content), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filenameSafe}-logos.zip"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
