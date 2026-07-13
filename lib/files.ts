import { readFile } from 'fs/promises';
import path from 'path';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

/** Reads a stored asset given its public path (e.g. /uploads/xyz.png). */
export async function readPublicFile(publicPath: string): Promise<Buffer> {
  const filename = path.basename(publicPath);
  return readFile(path.join(PUBLIC_DIR, 'uploads', filename));
}

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'logo';
}
