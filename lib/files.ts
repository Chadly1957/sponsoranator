// Blob reads can fail transiently (rate-limit bursts during bulk generation, eventual
// consistency right after an upload), so retry a couple of times before giving up.
const RETRY_DELAYS_MS = [750, 1500];

/** Downloads a stored logo's bytes from its Vercel Blob URL, retrying transient failures. */
export async function readLogoBytes(logoUrl: string): Promise<Buffer> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
    try {
      const res = await fetch(logoUrl, { cache: 'no-store' });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      lastError = new Error(`Could not read logo (HTTP ${res.status}).`);
      if (res.status < 500 && ![404, 408, 429].includes(res.status)) break;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not read logo.');
}

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'logo';
}
