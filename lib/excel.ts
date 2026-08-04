import * as XLSX from 'xlsx';
import { SignError } from './signFiles';

export interface SignListRow {
  rowNumber: number;
  sponsorship: string;
  company: string;
  size: string;
}

function findKey(keys: string[], name: string): string | undefined {
  return keys.find((k) => k.trim().toLowerCase() === name);
}

/**
 * Parses an uploaded sign list (.xlsx/.xls/.csv) into rows, reading the first sheet and
 * matching "Sponsorship", "Company", and "Size" columns by header name (case-insensitive).
 * Rows without a company name are dropped (blank spreadsheet rows, etc).
 */
export function parseSignListExcel(buffer: Buffer): SignListRow[] {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch {
    throw new SignError('Could not read that file as a spreadsheet.');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new SignError('The spreadsheet has no sheets.');
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (raw.length === 0) throw new SignError('The spreadsheet has no data rows.');

  const keys = Object.keys(raw[0]);
  const sponsorshipKey = findKey(keys, 'sponsorship');
  const companyKey = findKey(keys, 'company');
  const sizeKey = findKey(keys, 'size');
  if (!companyKey) {
    throw new SignError('Could not find a "Company" column in the spreadsheet.');
  }

  return raw
    .map((row, i) => ({
      rowNumber: i + 2, // account for the header row
      sponsorship: sponsorshipKey ? String(row[sponsorshipKey] ?? '').trim() : '',
      company: companyKey ? String(row[companyKey] ?? '').trim() : '',
      size: sizeKey ? String(row[sizeKey] ?? '').trim() : '',
    }))
    .filter((row) => row.company);
}
