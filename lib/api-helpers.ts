import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { LogoError, importLogoFromUpload, importLogoFromUrl } from './logo';
import { clampGeneralScale, clampLogoScale, clampLogosPerRow } from './tiers';

export function errorResponse(err: unknown) {
  if (err instanceof LogoError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return NextResponse.json(
      { error: 'That combination already exists.' },
      { status: 409 }
    );
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

/** Reads a "logosPerRow" field from FormData, clamped to 2/3/4. Undefined if not present. */
export function optionalLogosPerRow(form: FormData): number | undefined {
  const value = form.get('logosPerRow');
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return undefined;
  return clampLogosPerRow(parsed);
}

/** Reads a "generalScale" field from FormData, clamped to 0.5-2.0. Undefined if not present. */
export function optionalGeneralScale(form: FormData): number | undefined {
  const value = form.get('generalScale');
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return undefined;
  return clampGeneralScale(parsed);
}

/** Reads a "logoScale" field from FormData, clamped to 0.5-2.0. Undefined if not present. */
export function optionalLogoScale(form: FormData): number | undefined {
  const value = form.get('logoScale');
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return undefined;
  return clampLogoScale(parsed);
}

export function optionalBoolean(form: FormData, key: string): boolean | undefined {
  const value = form.get(key);
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return value === 'true' || value === 'on' || value === '1';
}
