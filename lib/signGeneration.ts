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

/** Per-request cache so bulk generation fetches each template PDF and each logo from blob
 *  storage once, instead of once per sign — most of the batch corruption we've seen came
 *  from hammering storage with dozens of identical reads in one burst. */
export interface SignRenderCache {
  templates: Map<string, Promise<Buffer>>;
  logos: Map<string, Promise<Buffer | null>>;
}

export function createSignRenderCache(): SignRenderCache {
  return { templates: new Map(), logos: new Map() };
}

function templateBytesFor(pdfPath: string, cache?: SignRenderCache): Promise<Buffer> {
  if (!cache) return readPdfBytes(pdfPath);
  let promise = cache.templates.get(pdfPath);
  if (!promise) {
    promise = readPdfBytes(pdfPath);
    cache.templates.set(pdfPath, promise);
  }
  return promise;
}

function logoBytesFor(logoPath: string | null | undefined, cache?: SignRenderCache): Promise<Buffer | null> {
  if (!logoPath) return Promise.resolve(null);
  if (!cache) return readLogoBytes(logoPath).catch(() => null);
  let promise = cache.logos.get(logoPath);
  if (!promise) {
    promise = readLogoBytes(logoPath).catch(() => null);
    cache.logos.set(logoPath, promise);
  }
  return promise;
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
 *  logo from the library. Pass a cache when rendering more than one sign in a request. */
export async function renderSignRecord(opts: {
  templateSize: TemplateSizeGeometry;
  sponsorship: string;
  textOverride?: string | null;
  logoPath?: string | null;
  textColor?: string;
  cache?: SignRenderCache;
}): Promise<Buffer> {
  const [templateBytes, logoBytes] = await Promise.all([
    templateBytesFor(opts.templateSize.pdfPath, opts.cache),
    logoBytesFor(opts.logoPath, opts.cache),
  ]);

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
