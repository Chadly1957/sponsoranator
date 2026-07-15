import { randomUUID } from 'crypto';
import { del, put } from '@vercel/blob';
import * as cheerio from 'cheerio';
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

interface CornerPixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

async function samplePixel(buffer: Buffer, x: number, y: number): Promise<CornerPixel> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .extract({ left: x, top: y, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { r: data[0], g: data[1], b: data[2], a: info.channels === 4 ? data[3] : 255 };
}

/** First subset of `items` (at least `minSize` of them) that are all mutually "close". */
function majorityCluster<T>(items: T[], close: (a: T, b: T) => boolean, minSize: number): T[] | null {
  for (const seed of items) {
    const cluster = items.filter((item) => close(item, seed));
    if (cluster.length >= minSize) return cluster;
  }
  return null;
}

type BackgroundGuess =
  | { kind: 'transparent' }
  | { kind: 'color'; r: number; g: number; b: number }
  | { kind: 'none' };

/**
 * Guesses a logo's background from its four corner pixels, requiring at least 3 of the 4
 * to roughly agree before trusting it — a single corner where the design happens to touch
 * the edge shouldn't throw off detection, but disagreement across the board means there's
 * no confident "background" to trim (e.g. genuinely edge-to-edge art), so we leave it alone.
 */
function detectBackground(corners: CornerPixel[]): BackgroundGuess {
  const transparentCluster = majorityCluster(corners, (a, b) => a.a < 20 && b.a < 20, 3);
  if (transparentCluster) return { kind: 'transparent' };

  const colorCluster = majorityCluster(
    corners,
    (a, b) =>
      a.a > 200 &&
      b.a > 200 &&
      Math.abs(a.r - b.r) < 18 &&
      Math.abs(a.g - b.g) < 18 &&
      Math.abs(a.b - b.b) < 18,
    3
  );
  if (colorCluster) {
    return {
      kind: 'color',
      r: Math.round(colorCluster.reduce((s, c) => s + c.r, 0) / colorCluster.length),
      g: Math.round(colorCluster.reduce((s, c) => s + c.g, 0) / colorCluster.length),
      b: Math.round(colorCluster.reduce((s, c) => s + c.b, 0) / colorCluster.length),
    };
  }

  return { kind: 'none' };
}

/**
 * Crops away uniform padding around a logo before it's fit into its cell, so a tightly
 * cropped mark and one buried in whitespace end up rendering at comparable sizes. Detects
 * the padding color itself (rather than assuming pure white) by sampling the four corners,
 * so it handles transparent PNGs, off-white/JPEG-noisy backgrounds, and colored mattes alike.
 * Falls back to leaving the image untouched whenever it isn't confident (see detectBackground).
 */
async function trimPadding(pngBuffer: Buffer): Promise<Buffer> {
  const meta = await sharp(pngBuffer).metadata();
  if (!meta.width || !meta.height) return pngBuffer;

  const corners = await Promise.all([
    samplePixel(pngBuffer, 0, 0),
    samplePixel(pngBuffer, meta.width - 1, 0),
    samplePixel(pngBuffer, 0, meta.height - 1),
    samplePixel(pngBuffer, meta.width - 1, meta.height - 1),
  ]);
  const bg = detectBackground(corners);

  if (bg.kind === 'none') return pngBuffer;

  try {
    if (bg.kind === 'transparent') {
      return await sharp(pngBuffer).trim({ threshold: 8 }).png().toBuffer();
    }
    return await sharp(pngBuffer)
      .trim({ background: `rgb(${bg.r},${bg.g},${bg.b})`, threshold: 24 })
      .png()
      .toBuffer();
  } catch {
    // Not all images trim cleanly (e.g. a background that isn't actually uniform once sharp
    // looks past the corners) — leave the image as-is rather than fail the whole import.
    return pngBuffer;
  }
}

/** Normalizes any input image buffer (png/jpg/webp/svg/gif) to a trimmed, size-capped PNG. */
export async function normalizeToPng(input: Buffer): Promise<Buffer> {
  let pipeline = sharp(input, { limitInputPixels: 40_000_000 }).png();

  const pngBuffer = await pipeline.toBuffer();
  pipeline = sharp(await trimPadding(pngBuffer));

  const meta = await pipeline.clone().metadata();
  if (meta.width && meta.height && (meta.width > MAX_DIMENSION || meta.height > MAX_DIMENSION)) {
    pipeline = pipeline.resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const buffer = await pipeline.png().toBuffer();
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

const SCRAPE_TIMEOUT_MS = 8000;
const SCRAPE_USER_AGENT =
  'Mozilla/5.0 (compatible; SponsoranatorBot/1.0; +logo lookup for event sponsor images)';

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Confirms a candidate URL actually resolves to a real (non-trivial) image. */
async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'Sponsoranator/1.0 (logo importer)' },
    });
    if (!res.ok) return false;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/') && !contentType.includes('svg')) return false;
    const arrayBuffer = await res.arrayBuffer();
    return arrayBuffer.byteLength >= 200; // rules out 1x1 tracking pixels / empty responses
  } catch {
    return false;
  }
}

/**
 * Scrapes a company's own homepage for its actual logo image — no third-party directory
 * involved, so it works for small/local businesses that a logo database wouldn't know about.
 * Looks for (roughly in order of confidence): an <img> that looks like a logo by
 * alt/class/id, the Open Graph / Twitter brand image, the apple touch icon, then the
 * plain favicon as a last resort.
 */
async function scrapeLogoForDomain(domain: string): Promise<string | null> {
  let baseUrl: string;
  let html: string;
  try {
    let res = await fetchWithTimeout(`https://${domain}`, {
      redirect: 'follow',
      headers: { 'User-Agent': SCRAPE_USER_AGENT },
    });
    if (!res.ok) {
      res = await fetchWithTimeout(`http://${domain}`, {
        redirect: 'follow',
        headers: { 'User-Agent': SCRAPE_USER_AGENT },
      });
    }
    if (!res.ok) return null;
    baseUrl = res.url;
    html = await res.text();
  } catch {
    return null;
  }

  const $ = cheerio.load(html);
  const candidates: { url: string; score: number }[] = [];

  const addCandidate = (src: string | undefined, score: number) => {
    if (!src) return;
    try {
      candidates.push({ url: new URL(src, baseUrl).toString(), score });
    } catch {
      // ignore malformed URLs
    }
  };

  $('img').each((_, el) => {
    const alt = ($(el).attr('alt') || '').toLowerCase();
    const cls = ($(el).attr('class') || '').toLowerCase();
    const id = ($(el).attr('id') || '').toLowerCase();
    if (/logo/.test(alt) || /logo/.test(cls) || /logo/.test(id)) {
      addCandidate($(el).attr('src') || $(el).attr('data-src'), 100);
    }
  });
  addCandidate($('meta[property="og:image"]').attr('content'), 60);
  addCandidate($('meta[name="twitter:image"]').attr('content'), 55);
  addCandidate($('link[rel="apple-touch-icon"]').attr('href'), 50);
  addCandidate($('link[rel="apple-touch-icon-precomposed"]').attr('href'), 50);
  addCandidate($('link[rel="icon"]').attr('href'), 20);
  addCandidate($('link[rel="shortcut icon"]').attr('href'), 15);

  candidates.sort((a, b) => b.score - a.score);

  for (const candidate of candidates) {
    if (await validateImageUrl(candidate.url)) return candidate.url;
  }
  return null;
}

/** Checks Clearbit's public logo directory for one exact domain. Returns the image URL, or null. */
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
 * Looks up a logo for a known, exact domain: scrapes the site's own homepage first (works
 * for small/local businesses), and only falls back to Clearbit's logo directory (which only
 * knows about companies it has indexed) if the scrape comes up empty.
 */
export async function findLogoUrlForDomain(domain: string): Promise<string | null> {
  const scraped = await scrapeLogoForDomain(domain);
  if (scraped) return scraped;
  return checkClearbitLogo(domain);
}

/**
 * Best-effort automatic logo lookup: guesses a domain from the company name, then looks
 * up a logo for each guess (site scrape first, Clearbit as a fallback). Returns the
 * external image URL if one was found (the caller still runs it through the normal
 * fetch/normalize/save pipeline), or null.
 */
export async function findLogoUrlForCompany(name: string): Promise<string | null> {
  for (const domain of guessDomainCandidates(name)) {
    const found = await findLogoUrlForDomain(domain);
    if (found) return found;
  }
  return null;
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
