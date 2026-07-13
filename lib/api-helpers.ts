import { NextResponse } from 'next/server';
import { LogoError, importLogoFromUpload, importLogoFromUrl } from './logo';

export function errorResponse(err: unknown) {
  if (err instanceof LogoError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error(err);
  const message = err instanceof Error ? err.message : 'Something went wrong.';
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Reads an optional logo from a submitted FormData (either a `file` upload or a `url` field).
 * Returns undefined when neither is present (caller should leave the existing logo untouched).
 */
export async function resolveLogoFromForm(form: FormData): Promise<string | undefined> {
  const file = form.get('file');
  if (file instanceof File && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    return importLogoFromUpload(bytes);
  }
  const url = form.get('url');
  if (typeof url === 'string' && url.trim()) {
    return importLogoFromUrl(url.trim());
  }
  return undefined;
}

export function requireString(form: FormData, key: string): string {
  const value = form.get(key);
  if (typeof value !== 'string' || !value.trim()) {
    throw new LogoError(`${key} is required.`);
  }
  return value.trim();
}

export function optionalString(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
