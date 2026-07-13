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
