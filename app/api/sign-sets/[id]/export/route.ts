import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { prisma } from '@/lib/db';
import { errorResponse } from '@/lib/api-helpers';
import { readPdfBytes, sanitizePdfFilename, saveExportZip } from '@/lib/signFiles';
import { slugifyFilename } from '@/lib/eventImage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PARALLEL_READS = 5;

/** Builds a zip of every generated sign in the set and uploads it to blob storage, returning
 *  a direct download URL. Serving the zip straight from this function would silently truncate
 *  anything past the serverless response size limit — a direct blob download has no such cap.
 *  Signs that can't be included are reported, and listed in a manifest inside the zip. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const signSet = await prisma.signSet.findUnique({
      where: { id: params.id },
      include: { signs: { orderBy: { order: 'asc' } } },
    });
    if (!signSet) return NextResponse.json({ error: 'Sign set not found.' }, { status: 404 });
    if (signSet.signs.length === 0) {
      return NextResponse.json({ error: 'This sign set has no signs yet.' }, { status: 400 });
    }

    const zip = new JSZip();
    const usedNames = new Set<string>();
    const missing: string[] = [];

    const entries = signSet.signs.map((sign) => ({
      sign,
      displayName: `${sanitizePdfFilename(sign.companyName)} - ${sanitizePdfFilename(sign.sizeLabel)}`,
    }));

    for (let i = 0; i < entries.length; i += PARALLEL_READS) {
      const batch = await Promise.all(
        entries.slice(i, i + PARALLEL_READS).map(async ({ sign, displayName }) => {
          if (!sign.pdfPath) {
            return { displayName, bytes: null, reason: 'not generated yet' };
          }
          try {
            return { displayName, bytes: await readPdfBytes(sign.pdfPath), reason: '' };
          } catch {
            return { displayName, bytes: null, reason: 'file could not be read' };
          }
        })
      );

      for (const { displayName, bytes, reason } of batch) {
        if (!bytes) {
          missing.push(`${displayName} — ${reason}`);
          continue;
        }
        let filename = `${displayName}.pdf`;
        let n = 2;
        while (usedNames.has(filename)) {
          filename = `${displayName} (${n}).pdf`;
          n++;
        }
        usedNames.add(filename);
        zip.file(filename, bytes);
      }
    }

    if (missing.length > 0) {
      zip.file(
        '_MISSING SIGNS.txt',
        `These signs are NOT in this zip:\n\n${missing.join('\n')}\n\n` +
          'Fix them in the app (edit the sign, or regenerate from the template) and export again.'
      );
    }

    const content = await zip.generateAsync({ type: 'nodebuffer' });
    const url = await saveExportZip(content, `${slugifyFilename(signSet.name)}-signs`);

    return NextResponse.json({
      url: `${url}?download=1`,
      included: signSet.signs.length - missing.length,
      total: signSet.signs.length,
      missing,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
