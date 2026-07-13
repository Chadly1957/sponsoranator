import { createCanvas, GlobalFonts, Image, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import path from 'path';
import { readLogoBytes } from './files';
import { cellHeightForTier, columnsForTier, TIER_LABELS, TIER_ORDER, type Tier } from './tiers';

const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts');
const FONT_REGULAR = 'Sponsoranator Sans';
const FONT_BOLD = 'Sponsoranator Sans Bold';

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  GlobalFonts.registerFromPath(path.join(FONT_DIR, 'LiberationSans-Regular.ttf'), FONT_REGULAR);
  GlobalFonts.registerFromPath(path.join(FONT_DIR, 'LiberationSans-Bold.ttf'), FONT_BOLD);
  fontsRegistered = true;
}

export interface RenderSponsor {
  id: string;
  companyName: string;
  logoPath: string | null;
  tier: string;
  order: number;
}

export interface RenderEventInfo {
  name: string;
  logoPath: string | null;
  primaryColor: string;
  accentColor: string;
  topTierLabel: string;
  logosPerRow: number;
  generalScale: number;
  showTierLabels: boolean;
}

const CANVAS_WIDTH = 1000;
const SIDE_PAD = 44;
const CORNER_RADIUS = 26;
const BORDER_WIDTH = 8;

const HEADER_TOP_PAD = 34;
const LOGO_MAX_WIDTH = CANVAS_WIDTH - 220;
const LOGO_MAX_HEIGHT = 190;
const GAP_LOGO_TO_TITLE = 18;
const TITLE_HEIGHT = 56;
const HEADER_BOTTOM_PAD = 30;

const TIER_GAP = 14;
const BODY_TOP_PAD = 34;
const BODY_BOTTOM_PAD = 44;
const CELL_GAP = 18;
const CELL_INNER_PAD = 14;

const TIER_LABEL_FONT_SIZE = 20;
const TIER_LABEL_HEIGHT = 26;
const TIER_LABEL_GAP = 10;

/** Category labels (e.g. "Gold") are drawn for every tier except General. */
function tierLabelBlockHeight(tier: Tier, showTierLabels: boolean): number {
  return showTierLabels && tier !== 'GENERAL' ? TIER_LABEL_HEIGHT + TIER_LABEL_GAP : 0;
}

function roundedRectPath(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function loadImageSafe(logoPath: string | null): Promise<Image | null> {
  if (!logoPath) return null;
  try {
    const buf = await readLogoBytes(logoPath);
    return await loadImage(buf);
  } catch {
    return null;
  }
}

function drawContain(
  ctx: SKRSContext2D,
  img: Image,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
) {
  const scale = Math.min(boxW / img.width, boxH / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const dx = boxX + (boxW - drawW) / 2;
  const dy = boxY + (boxH - drawH) / 2;
  ctx.drawImage(img, dx, dy, drawW, drawH);
}

function drawPlaceholder(ctx: SKRSContext2D, name: string, x: number, y: number, w: number, h: number) {
  roundedRectPath(ctx, x, y, w, h, 8);
  ctx.fillStyle = '#f1f3f5';
  ctx.fill();
  ctx.strokeStyle = '#dde1e5';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#5c6570';
  ctx.font = `bold 16px "${FONT_BOLD}"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const words = name.split(' ');
  const lines: string[] = [];
  let line = '';
  const maxLineWidth = w - 16;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxLineWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, 2);
  const lineHeight = 20;
  const startY = y + h / 2 - ((shown.length - 1) * lineHeight) / 2;
  shown.forEach((l, i) => {
    ctx.fillText(l, x + w / 2, startY + i * lineHeight, maxLineWidth);
  });
}

function tierRows(count: number, columns: number): number {
  return Math.max(1, Math.ceil(count / columns));
}

/** Computes the total canvas height needed for the given sponsor set. */
function computeHeight(
  groupedCounts: Partial<Record<Tier, number>>,
  logosPerRow: number,
  generalScale: number,
  showTierLabels: boolean
): number {
  let height = HEADER_TOP_PAD + LOGO_MAX_HEIGHT + GAP_LOGO_TO_TITLE + TITLE_HEIGHT + HEADER_BOTTOM_PAD;
  height += BODY_TOP_PAD;
  let firstTier = true;
  for (const tier of TIER_ORDER) {
    const count = groupedCounts[tier] ?? 0;
    if (count === 0) continue;
    if (!firstTier) height += TIER_GAP;
    firstTier = false;
    height += tierLabelBlockHeight(tier, showTierLabels);
    const columns = columnsForTier(tier, logosPerRow);
    height += tierRows(count, columns) * cellHeightForTier(tier, generalScale);
  }
  height += BODY_BOTTOM_PAD;
  return Math.round(height);
}

export async function renderEventImage(event: RenderEventInfo, sponsors: RenderSponsor[]): Promise<Buffer> {
  ensureFonts();

  const grouped: Partial<Record<Tier, RenderSponsor[]>> = {};
  for (const s of sponsors) {
    const tier = (TIER_ORDER as readonly string[]).includes(s.tier) ? (s.tier as Tier) : 'GENERAL';
    (grouped[tier] ??= []).push(s);
  }
  for (const tier of TIER_ORDER) {
    grouped[tier]?.sort((a, b) => a.order - b.order);
  }

  const counts: Partial<Record<Tier, number>> = {};
  for (const tier of TIER_ORDER) counts[tier] = grouped[tier]?.length ?? 0;

  const canvasHeight = computeHeight(counts, event.logosPerRow, event.generalScale, event.showTierLabels);
  const canvas = createCanvas(CANVAS_WIDTH, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Clip to outer rounded rect, fill white background.
  ctx.save();
  roundedRectPath(ctx, 0, 0, CANVAS_WIDTH, canvasHeight, CORNER_RADIUS);
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

  const headerHeight = HEADER_TOP_PAD + LOGO_MAX_HEIGHT + GAP_LOGO_TO_TITLE + TITLE_HEIGHT + HEADER_BOTTOM_PAD;
  ctx.fillStyle = event.primaryColor || '#0a2f5c';
  ctx.fillRect(0, 0, CANVAS_WIDTH, headerHeight);

  // Event logo (or event name as fallback).
  const eventLogoImg = await loadImageSafe(event.logoPath);
  const logoBoxY = HEADER_TOP_PAD;
  if (eventLogoImg) {
    drawContain(ctx, eventLogoImg, (CANVAS_WIDTH - LOGO_MAX_WIDTH) / 2, logoBoxY, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 46px "${FONT_BOLD}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(event.name, CANVAS_WIDTH / 2, logoBoxY + LOGO_MAX_HEIGHT / 2, LOGO_MAX_WIDTH);
  }

  // "SPONSORS" title.
  const titleY = logoBoxY + LOGO_MAX_HEIGHT + GAP_LOGO_TO_TITLE + TITLE_HEIGHT / 2;
  ctx.font = `bold 42px "${FONT_BOLD}"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.strokeText('SPONSORS', CANVAS_WIDTH / 2, titleY);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('SPONSORS', CANVAS_WIDTH / 2, titleY);

  // Sponsor grid.
  let y = headerHeight + BODY_TOP_PAD;
  let firstTier = true;
  for (const tier of TIER_ORDER) {
    const list = grouped[tier];
    if (!list || list.length === 0) continue;
    if (!firstTier) y += TIER_GAP;
    firstTier = false;

    if (event.showTierLabels && tier !== 'GENERAL') {
      const labelText = (tier === 'PRESENTING' ? event.topTierLabel : TIER_LABELS[tier]).toUpperCase();
      ctx.font = `bold ${TIER_LABEL_FONT_SIZE}px "${FONT_BOLD}"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = event.accentColor || '#e8384f';
      ctx.fillText(labelText, CANVAS_WIDTH / 2, y, CANVAS_WIDTH - SIDE_PAD * 2);
      y += TIER_LABEL_HEIGHT + TIER_LABEL_GAP;
    }

    const columns = columnsForTier(tier, event.logosPerRow);
    const cellHeight = cellHeightForTier(tier, event.generalScale);
    const gridWidth = CANVAS_WIDTH - SIDE_PAD * 2;
    const cellWidth = (gridWidth - CELL_GAP * (columns - 1)) / columns;

    for (let i = 0; i < list.length; i++) {
      const row = Math.floor(i / columns);
      const col = i % columns;
      const rowsInTier = tierRows(list.length, columns);
      // Center the last (possibly partial) row.
      const itemsInRow = row === rowsInTier - 1 ? list.length - row * columns : columns;
      const rowOffsetX = ((columns - itemsInRow) * (cellWidth + CELL_GAP)) / 2;

      const cellX = SIDE_PAD + rowOffsetX + col * (cellWidth + CELL_GAP);
      const cellY = y + row * cellHeight;

      const innerX = cellX + CELL_INNER_PAD;
      const innerY = cellY + CELL_INNER_PAD;
      const innerW = cellWidth - CELL_INNER_PAD * 2;
      const innerH = cellHeight - CELL_INNER_PAD * 2;

      const sponsor = list[i];
      const img = await loadImageSafe(sponsor.logoPath);
      if (img) {
        drawContain(ctx, img, innerX, innerY, innerW, innerH);
      } else {
        drawPlaceholder(ctx, sponsor.companyName, innerX, innerY, innerW, innerH);
      }
    }

    y += tierRows(list.length, columns) * cellHeight;
  }

  ctx.restore();

  // Outer border stroke.
  roundedRectPath(
    ctx,
    BORDER_WIDTH / 2,
    BORDER_WIDTH / 2,
    CANVAS_WIDTH - BORDER_WIDTH,
    canvasHeight - BORDER_WIDTH,
    CORNER_RADIUS
  );
  ctx.lineWidth = BORDER_WIDTH;
  ctx.strokeStyle = event.primaryColor || '#0a2f5c';
  ctx.stroke();

  return canvas.toBuffer('image/png');
}
