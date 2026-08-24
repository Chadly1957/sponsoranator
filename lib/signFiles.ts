import { randomUUID } from 'crypto';
import { del, put } from '@vercel/blob';

const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25MB

export class SignError extends Error {}

// Blob reads can fail transiently (rate-limit bursts during bulk generation, eventual
// consistency right after an upload), so retry a couple of times before giving up —
// treating one flaky read as a permanently broken sign is what corrupts batches.
const RETRY_DELAYS_MS = [750, 1500];

async function fetchBufferWithRetry(url: string, what: string): Promise<Buffer> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      lastError = new SignError(`Could not read ${what} (HTTP ${res.status}).`);
      // Retry server errors, rate limits, and 404s (a just-uploaded blob can briefly 404);
      // other 4xx statuses are permanent, so don't burn time retrying them.
      if (res.status < 500 && ![404, 408, 429].includes(res.status)) break;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new SignError(`Could not read ${what}.`);
}

/** Downloads a stored PDF's bytes from its Vercel Blob URL, retrying transient failures. */
export async function readPdfBytes(url: string): Promise<Buffer> {
  return fetchBufferWithRetry(url, 'PDF');
}

/** Throws if the given bytes don't look like a PDF. */
export function assertLooksLikePdf(bytes: Buffer) {
  if (bytes.byteLength > MAX_PDF_BYTES) {
    throw new SignError('PDF is too large (max 25MB).');
  }
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new SignError('That file does not look like a PDF.');
  }
}

export async function saveTemplatePdf(buffer: Buffer): Promise<string> {
  assertLooksLikePdf(buffer);
  const blob = await put(`sign-templates/${randomUUID()}.pdf`, buffer, {
    access: 'public',
    contentType: 'application/pdf',
  });
  return blob.url;
}

/** Saves a generated sign PDF. The pathname ends in a human-readable filename so the blob
 *  URL can be downloaded directly (with ?download=1) and land as e.g. "Acme - Small.pdf". */
export async function saveGeneratedSignPdf(buffer: Buffer, baseName: string): Promise<string> {
  const blob = await put(`signs/${randomUUID()}/${sanitizePdfFilename(baseName)}.pdf`, buffer, {
    access: 'public',
    contentType: 'application/pdf',
  });
  return blob.url;
}

/** Saves a zip of generated signs, named so a direct download gets a sensible filename. */
export async function saveExportZip(buffer: Buffer, baseName: string): Promise<string> {
  const blob = await put(`sign-exports/${randomUUID()}/${sanitizePdfFilename(baseName)}.zip`, buffer, {
    access: 'public',
    contentType: 'application/zip',
  });
  return blob.url;
}

export async function deletePdfFile(path: string | null | undefined) {
  if (!path) return;
  try {
    await del(path);
  } catch {
    // ignore missing/already-deleted blobs
  }
}

export function sanitizePdfFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'sign';
}
