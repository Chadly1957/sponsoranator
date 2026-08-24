import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';

/** A placeholder box in PDF points, measured from the page's top-left corner (matches the
 *  editor UI's coordinate convention) — converted to PDF's bottom-left origin at draw time. */
export interface PdfBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface BottomBox {
  x: number;
  yBottom: number;
  w: number;
  h: number;
}

function toBottomBox(box: PdfBox, pageHeight: number): BottomBox {
  return { x: box.x, yBottom: pageHeight - box.y - box.h, w: box.w, h: box.h };
}

/** Parses a "#rrggbb" hex color into pdf-lib's 0-1 RGB, falling back to black. */
function hexToRgb(hex: string | undefined) {
  const match = /^#?([0-9a-fA-F]{6})$/.exec((hex ?? '').trim());
  if (!match) return rgb(0, 0, 0);
  const int = parseInt(match[1], 16);
  return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255);
}

/** Splits text on existing newlines, then greedily word-wraps each paragraph to maxWidth. */
function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export interface RenderSignOptions {
  templatePdfBytes: Buffer | Uint8Array;
  pageWidth: number;
  pageHeight: number;
  textBox: PdfBox;
  logoBox: PdfBox;
  /** The sign's text — normally the sponsorship title (e.g. "Dinner Sponsor"). */
  text: string;
  /** Hex color (e.g. "#0a2f5c") for the text — defaults to black. */
  textColor?: string;
  logoBytes?: Buffer | null;
}

/**
 * Draws a sponsoring company's logo and a title (the sponsorship being recognized, e.g.
 * "Hole Sponsor") into a blank template PDF's placeholder boxes, shrinking the text to fit.
 */
export async function renderSignPdf(opts: RenderSignOptions): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(opts.templatePdfBytes);
  const page = pdfDoc.getPages()[0];
  if (!page) throw new Error('Template PDF has no pages.');

  if (opts.logoBytes && opts.logoBox.w > 0 && opts.logoBox.h > 0) {
    let image = null;
    try {
      image = await pdfDoc.embedPng(opts.logoBytes);
    } catch {
      try {
        image = await pdfDoc.embedJpg(opts.logoBytes);
      } catch {
        image = null;
      }
    }
    if (image) {
      const box = toBottomBox(opts.logoBox, opts.pageHeight);
      const scale = Math.min(box.w / image.width, box.h / image.height);
      const drawW = image.width * scale;
      const drawH = image.height * scale;
      page.drawImage(image, {
        x: box.x + (box.w - drawW) / 2,
        y: box.yBottom + (box.h - drawH) / 2,
        width: drawW,
        height: drawH,
      });
    }
  }

  if (opts.textBox.w > 0 && opts.textBox.h > 0 && opts.text.trim()) {
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const box = toBottomBox(opts.textBox, opts.pageHeight);
    const baseSize = box.h * 0.4;

    let scale = 1;
    let lines: string[] = [];
    let size = baseSize;
    for (let attempt = 0; attempt < 8; attempt++) {
      size = Math.max(6, baseSize * scale);
      lines = wrapText(bold, opts.text, size, box.w);
      const totalHeight = lines.length * size * 1.25;
      if (totalHeight <= box.h || scale <= 0.25) break;
      scale *= 0.85;
    }

    const lineHeight = size * 1.25;
    const totalHeight = lines.length * lineHeight;
    let cursorY = box.yBottom + box.h - (box.h - totalHeight) / 2;
    for (const line of lines) {
      cursorY -= lineHeight;
      const width = bold.widthOfTextAtSize(line, size);
      page.drawText(line, {
        x: box.x + (box.w - width) / 2,
        y: cursorY + lineHeight * 0.22,
        size,
        font: bold,
        color: hexToRgb(opts.textColor),
      });
    }
  }

  return Buffer.from(await pdfDoc.save());
}

export async function getPdfPageSize(bytes: Buffer | Uint8Array): Promise<{ width: number; height: number }> {
  const pdfDoc = await PDFDocument.load(bytes);
  const page = pdfDoc.getPages()[0];
  if (!page) throw new Error('PDF has no pages.');
  return page.getSize();
}
