import { randomUUID } from 'crypto';
import { del, put } from '@vercel/blob';
import sharp from 'sharp';

const MAX_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_DIMENSION = 900;

export class LogoError extends Error {}

/** Downloads an image from a URL and returns the raw bytes + content-type. */
export async function fetchImageFromUrl(url: string): Promise<Buffer> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new LogoError('That is not a valid URL.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new LogoError('Only http/https URLs are supported.');
  }

  const res = await fetch(parsed.toString(), {
    redirect: 'follow',
    headers: { 'User-Agent': 'Sponsoranator/1.0 (logo importer)' },
  }).catch(() => {
    throw new LogoError('Could not reach that URL.');
  });

  if (!res.ok) {
    throw new LogoError(`Fetching the logo failed (HTTP ${res.status}).`);
  }

  const contentLength = res.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_BYTES) {
    throw new LogoError('Image is too large (max 15MB).');
  }

  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    throw new LogoError('Image is too large (max 15MB).');
  }
  return Buffer.from(arrayBuffer);
}

/** Normalizes any input image buffer (png/jpg/webp/svg/gif) to a trimmed, size-capped PNG. */
export async function normalizeToPng(input: Buffer): Promise<Buffer> {
  let pipeline = sharp(input, { limitInputPixels: 40_000_000 }).png();

  try {
    pipeline = sharp(await pipeline.toBuffer()).trim({ background: '#FFFFFF', threshold: 12 }).png();
    // Validate the trim didn't throw and produced something usable.
    await pipeline.clone().toBuffer();
  } catch {
    // Not all images trim cleanly (e.g. already-transparent art); fall back to untrimmed.
    pipeline = sharp(input, { limitInputPixels: 40_000_000 }).png();
  }

  const meta = await pipeline.clone().metadata();
  if (meta.width && meta.height && (meta.width > MAX_DIMENSION || meta.height > MAX_DIMENSION)) {
    pipeline = pipeline.resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const buffer = await pipeline.toBuffer();
  if (!buffer.length) {
    throw new LogoError('Could not process that image.');
  }
  return buffer;
}

/** Uploads a normalized PNG buffer to Vercel Blob and returns its public URL. */
export async function saveLogoPng(buffer: Buffer): Promise<string> {
  const blob = await put(`logos/${randomUUID()}.png`, buffer, {
    access: 'public',
    contentType: 'image/png',
  });
  return blob.url;
}

export async function deleteLogoFile(logoPath: string | null | undefined) {
  if (!logoPath) return;
  try {
    await del(logoPath);
  } catch {
    // ignore missing/already-deleted blobs
  }
}

/** High-level helper: fetch a logo from a URL, normalize, and save it. */
export async function importLogoFromUrl(url: string): Promise<string> {
  const raw = await fetchImageFromUrl(url);
  const png = await normalizeToPng(raw);
  return saveLogoPng(png);
}

/** High-level helper: normalize and save an uploaded file's bytes. */
export async function importLogoFromUpload(bytes: Buffer): Promise<string> {
  const png = await normalizeToPng(bytes);
  return saveLogoPng(png);
}

/** Best-effort guess at a company name from a URL's domain. */
export function guessNameFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const base = host.split('.')[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return '';
  }
}

const COMPANY_SUFFIXES =
  /\b(inc|incorporated|llc|ltd|limited|corp|corporation|co|company|group|holdings)\b\.?/gi;

/** Turns a company name into a short list of likely-domain guesses, best guess first. */
function guessDomainCandidates(name: string): string[] {
  const base = name
    .toLowerCase()
    .replace(/[.,'’&]/g, '')
    .replace(COMPANY_SUFFIXES, '')
    .trim();
  const compact = base.replace(/[^a-z0-9]+/g, '');
  const hyphenated = base.replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  const candidates: string[] = [];
  if (compact) candidates.push(`${compact}.com`);
  if (hyphenated && hyphenated !== compact) candidates.push(`${hyphenated}.com`);
  return candidates.slice(0, 3);
}

/** Checks Clearbit's public logo API for one exact domain. Returns the image URL, or null. */
async function checkClearbitLogo(domain: string): Promise<string | null> {
  const candidateUrl = `https://logo.clearbit.com/${domain}?size=256`;
  try {
    const res = await fetch(candidateUrl, {
      headers: { 'User-Agent': 'Sponsoranator/1.0 (logo importer)' },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength < 200) return null; // too small to be a real logo
    return candidateUrl;
  } catch {
    return null;
  }
}

/**
 * Best-effort automatic logo lookup: guesses a domain from the company name and asks
 * Clearbit's public logo API for it. Returns the external image URL if one was found
 * (the caller still runs it through the normal fetch/normalize/save pipeline), or null.
 */
export async function findLogoUrlForCompany(name: string): Promise<string | null> {
  for (const domain of guessDomainCandidates(name)) {
    const found = await checkClearbitLogo(domain);
    if (found) return found;
  }
  return null;
}

/** Looks up a logo for a known, exact domain (no guessing) via Clearbit. */
export async function findLogoUrlForDomain(domain: string): Promise<string | null> {
  return checkClearbitLogo(domain);
}

/** True if the input reads like a website (a bare domain or full URL) rather than a company name. */
export function looksLikeWebsite(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  return /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(trimmed);
}

/** Normalizes a bare domain or URL string (with or without protocol) down to a hostname. */
export function extractDomain(input: string): string | null {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
