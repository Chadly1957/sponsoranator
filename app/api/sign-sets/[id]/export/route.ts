import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { prisma } from '@/lib/db';
import { errorResponse } from '@/lib/api-helpers';
import { readPdfBytes, sanitizePdfFilename } from '@/lib/signFiles';
import { slugifyFilename } from '@/lib/eventImage';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const signSet = await prisma.signSet.findUnique({
      where: { id: params.id },
      include: { signs: { orderBy: { order: 'asc' } } },
    });
    if (!signSet) return NextResponse.json({ error: 'Sign set not found.' }, { status: 404 });

    const zip = new JSZip();
    const usedNames = new Set<string>();

    for (const sign of signSet.signs) {
      if (!sign.pdfPath) continue;
      try {
        const bytes = await readPdfBytes(sign.pdfPath);
        const base = `${sanitizePdfFilename(sign.companyName)} - ${sanitizePdfFilename(sign.sizeLabel)}`;
        let filename = `${base}.pdf`;
        let n = 2;
        while (usedNames.has(filename)) {
          filename = `${base} (${n}).pdf`;
          n++;
        }
        usedNames.add(filename);
        zip.file(filename, bytes);
      } catch {
        // skip signs that fail to read
      }
    }

    const content = await zip.generateAsync({ type: 'nodebuffer' });
    const filenameSafe = slugifyFilename(signSet.name);

    return new NextResponse(new Uint8Array(content), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filenameSafe}-signs.zip"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
