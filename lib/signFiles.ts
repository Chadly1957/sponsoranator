import { randomUUID } from 'crypto';
import { del, put } from '@vercel/blob';

const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25MB

export class SignError extends Error {}

/** Downloads a stored PDF's bytes from its Vercel Blob URL. */
export async function readPdfBytes(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new SignError(`Could not read PDF (HTTP ${res.status}).`);
  }
  return Buffer.from(await res.arrayBuffer());
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

export async function saveGeneratedSignPdf(buffer: Buffer): Promise<string> {
  const blob = await put(`signs/${randomUUID()}.pdf`, buffer, {
    access: 'public',
    contentType: 'application/pdf',
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
