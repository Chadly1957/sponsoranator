/** Downloads a stored logo's bytes from its Vercel Blob URL. */
export async function readLogoBytes(logoUrl: string): Promise<Buffer> {
  const res = await fetch(logoUrl);
  if (!res.ok) {
    throw new Error(`Could not read logo (HTTP ${res.status}).`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'logo';
}
