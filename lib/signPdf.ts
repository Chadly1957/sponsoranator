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

interface TextBlockSpec {
  text: string;
  font: PDFFont;
  baseSize: number;
}

export interface RenderSignOptions {
  templatePdfBytes: Buffer | Uint8Array;
  pageWidth: number;
  pageHeight: number;
  textBox: PdfBox;
  logoBox: PdfBox;
  /** Company name — used as the bold title line unless `rawText` overrides it entirely. */
  titleText: string;
  /** Sponsorship level (e.g. "Gold Sponsor") — shown as a smaller line under the title. */
  subtitleText?: string;
  /** A manually edited replacement for the auto-generated title/subtitle, verbatim (supports \n). */
  rawText?: string | null;
  logoBytes?: Buffer | null;
}

/**
 * Draws a company logo and text (company name + sponsorship level, or a manual override)
 * into a blank template PDF's placeholder boxes, shrinking the text to fit if needed.
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

  if (opts.textBox.w > 0 && opts.textBox.h > 0) {
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const box = toBottomBox(opts.textBox, opts.pageHeight);

    const blocks: TextBlockSpec[] = [];
    if (opts.rawText && opts.rawText.trim()) {
      blocks.push({ text: opts.rawText, font: bold, baseSize: box.h * 0.3 });
    } else {
      blocks.push({ text: opts.titleText, font: bold, baseSize: box.h * 0.32 });
      if (opts.subtitleText && opts.subtitleText.trim()) {
        blocks.push({ text: opts.subtitleText, font: regular, baseSize: box.h * 0.18 });
      }
    }

    let scale = 1;
    let wrapped: { lines: string[]; font: PDFFont; size: number }[] = [];
    for (let attempt = 0; attempt < 8; attempt++) {
      wrapped = blocks.map((b) => {
        const size = Math.max(6, b.baseSize * scale);
        return { lines: wrapText(b.font, b.text, size, box.w), font: b.font, size };
      });
      const totalHeight = wrapped.reduce((sum, b) => sum + b.lines.length * b.size * 1.25, 0);
      if (totalHeight <= box.h || scale <= 0.25) break;
      scale *= 0.85;
    }

    const totalHeight = wrapped.reduce((sum, b) => sum + b.lines.length * b.size * 1.25, 0);
    let cursorY = box.yBottom + box.h - (box.h - totalHeight) / 2;
    for (const block of wrapped) {
      const lineHeight = block.size * 1.25;
      for (const line of block.lines) {
        cursorY -= lineHeight;
        const width = block.font.widthOfTextAtSize(line, block.size);
        page.drawText(line, {
          x: box.x + (box.w - width) / 2,
          y: cursorY + lineHeight * 0.22,
          size: block.size,
          font: block.font,
          color: rgb(0, 0, 0),
        });
      }
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
