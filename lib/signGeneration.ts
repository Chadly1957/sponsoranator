import { prisma } from './db';
import { renderSignPdf } from './signPdf';
import { readPdfBytes } from './signFiles';
import { readLogoBytes } from './files';

interface TemplateSizeGeometry {
  pdfPath: string;
  pageWidth: number;
  pageHeight: number;
  textBoxX: number;
  textBoxY: number;
  textBoxW: number;
  textBoxH: number;
  logoBoxX: number;
  logoBoxY: number;
  logoBoxW: number;
  logoBoxH: number;
}

/** Finds the SignTemplateSize on a template whose label matches (case/whitespace-insensitive). */
export function matchTemplateSize<T extends { label: string }>(sizes: T[], label: string): T | null {
  const norm = label.trim().toLowerCase();
  if (!norm) return null;
  return sizes.find((s) => s.label.trim().toLowerCase() === norm) ?? null;
}

/** Finds a library Company by exact (case-insensitive) name match. */
export async function findCompanyByName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return prisma.company.findFirst({ where: { name: { equals: trimmed, mode: 'insensitive' } } });
}

/** Renders one sign's PDF from a resolved template size — the text box shows the sponsorship
 *  title (e.g. "Hole Sponsor") unless manually overridden; the logo box shows the company's
 *  logo from the library. */
export async function renderSignRecord(opts: {
  templateSize: TemplateSizeGeometry;
  sponsorship: string;
  textOverride?: string | null;
  logoPath?: string | null;
  textColor?: string;
}): Promise<Buffer> {
  const templateBytes = await readPdfBytes(opts.templateSize.pdfPath);

  let logoBytes: Buffer | null = null;
  if (opts.logoPath) {
    try {
      logoBytes = await readLogoBytes(opts.logoPath);
    } catch {
      logoBytes = null;
    }
  }

  return renderSignPdf({
    templatePdfBytes: templateBytes,
    pageWidth: opts.templateSize.pageWidth,
    pageHeight: opts.templateSize.pageHeight,
    textBox: {
      x: opts.templateSize.textBoxX,
      y: opts.templateSize.textBoxY,
      w: opts.templateSize.textBoxW,
      h: opts.templateSize.textBoxH,
    },
    logoBox: {
      x: opts.templateSize.logoBoxX,
      y: opts.templateSize.logoBoxY,
      w: opts.templateSize.logoBoxW,
      h: opts.templateSize.logoBoxH,
    },
    text: opts.textOverride?.trim() ? opts.textOverride : opts.sponsorship,
    textColor: opts.textColor,
    logoBytes,
  });
}
