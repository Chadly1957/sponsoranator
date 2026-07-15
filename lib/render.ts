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
  bronzeGeneralDivider: boolean;
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

const DIVIDER_EXTRA_GAP = 22;
const DIVIDER_COLOR = '#d7dbe1';
const DIVIDER_THICKNESS = 1.5;

/** Extra vertical space to open up for the optional Bronze/General divider rule. */
function dividerGap(prevTier: Tier | undefined, tier: Tier, enabled: boolean): number {
  return enabled && prevTier === 'BRONZE' && tier === 'GENERAL' ? DIVIDER_EXTRA_GAP : 0;
}

// A pure contain-fit (min of width-scale/height-scale) makes wide "wordmark" logos fill
// their cell edge-to-edge while square/tall logos hit the height limit first and end up
// visibly tiny by comparison, even though they're not using the available width either.
// To balance that, each row's height is allowed to grow (up to a cap) so that any logo in
// it can reach roughly the same *rendered area* as a wide logo would at that cell's nominal
// size, not just the same bounding box. Wide logos are already width-capped and unaffected;
// square/tall ones get taller (never wider than the column) until they're visually on par.
const ROW_FILL_RATIO = 0.7;
const MAX_ROW_HEIGHT_MULTIPLIER = 1.5;

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

interface RowItem {
  sponsor: RenderSponsor;
  img: Image | null;
  drawW: number;
  drawH: number;
}

interface RowLayout {
  items: RowItem[];
  innerHeight: number;
}

interface TierLayout {
  tier: Tier;
  columns: number;
  cellWidth: number;
  labelHeight: number;
  rows: RowLayout[];
}

/**
 * Chunks a tier's sponsors into rows and, for each row, picks a height that lets every
 * logo in it reach a comparable rendered area (see ROW_FILL_RATIO comment above) — then
 * fits each logo within that row's final (columnWidth x rowHeight) box.
 */
async function buildTierRows(
  list: RenderSponsor[],
  columns: number,
  cellWidth: number,
  baseCellHeight: number
): Promise<RowLayout[]> {
  const innerWidth = cellWidth - CELL_INNER_PAD * 2;
  const baseInnerHeight = baseCellHeight - CELL_INNER_PAD * 2;
  const maxInnerHeight = baseInnerHeight * MAX_ROW_HEIGHT_MULTIPLIER;
  const targetArea = innerWidth * baseInnerHeight * ROW_FILL_RATIO;

  const rows: RowLayout[] = [];
  for (let start = 0; start < list.length; start += columns) {
    const chunk = list.slice(start, start + columns);
    const withImages = await Promise.all(
      chunk.map(async (sponsor) => ({ sponsor, img: await loadImageSafe(sponsor.logoPath) }))
    );

    let neededHeight = baseInnerHeight;
    for (const { img } of withImages) {
      if (!img) continue;
      const naiveScale = Math.min(innerWidth / img.width, baseInnerHeight / img.height);
      const areaScale = Math.sqrt(targetArea / (img.width * img.height));
      const widthCappedAreaScale = Math.min(areaScale, innerWidth / img.width);
      const effectiveScale = Math.max(naiveScale, widthCappedAreaScale);
      neededHeight = Math.max(neededHeight, img.height * effectiveScale);
    }
    const rowInnerHeight = Math.min(neededHeight, maxInnerHeight);

    const items: RowItem[] = withImages.map(({ sponsor, img }) => {
      if (!img) return { sponsor, img: null, drawW: 0, drawH: 0 };
      const scale = Math.min(innerWidth / img.width, rowInnerHeight / img.height);
      return { sponsor, img, drawW: img.width * scale, drawH: img.height * scale };
    });

    rows.push({ items, innerHeight: rowInnerHeight });
  }
  return rows;
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

  const gridWidth = CANVAS_WIDTH - SIDE_PAD * 2;
  const tierLayouts: TierLayout[] = [];
  for (const tier of TIER_ORDER) {
    const list = grouped[tier];
    if (!list || list.length === 0) continue;
    const columns = columnsForTier(tier, event.logosPerRow);
    const cellWidth = (gridWidth - CELL_GAP * (columns - 1)) / columns;
    const baseCellHeight = cellHeightForTier(tier, event.generalScale);
    const rows = await buildTierRows(list, columns, cellWidth, baseCellHeight);
    tierLayouts.push({
      tier,
      columns,
      cellWidth,
      labelHeight: tierLabelBlockHeight(tier, event.showTierLabels),
      rows,
    });
  }

  const headerHeight = HEADER_TOP_PAD + LOGO_MAX_HEIGHT + GAP_LOGO_TO_TITLE + TITLE_HEIGHT + HEADER_BOTTOM_PAD;

  let bodyHeight = BODY_TOP_PAD;
  tierLayouts.forEach((t, idx) => {
    if (idx > 0) {
      bodyHeight += TIER_GAP + dividerGap(tierLayouts[idx - 1].tier, t.tier, event.bronzeGeneralDivider);
    }
    bodyHeight += t.labelHeight;
    for (const row of t.rows) bodyHeight += row.innerHeight + CELL_INNER_PAD * 2;
  });
  bodyHeight += BODY_BOTTOM_PAD;

  const canvasHeight = Math.round(headerHeight + bodyHeight);
  const canvas = createCanvas(CANVAS_WIDTH, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Clip to outer rounded rect, fill white background.
  ctx.save();
  roundedRectPath(ctx, 0, 0, CANVAS_WIDTH, canvasHeight, CORNER_RADIUS);
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

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
  tierLayouts.forEach((t, idx) => {
    if (idx > 0) {
      y += TIER_GAP;
      const extraGap = dividerGap(tierLayouts[idx - 1].tier, t.tier, event.bronzeGeneralDivider);
      if (extraGap > 0) {
        const lineY = y + extraGap / 2;
        ctx.strokeStyle = DIVIDER_COLOR;
        ctx.lineWidth = DIVIDER_THICKNESS;
        ctx.beginPath();
        ctx.moveTo(SIDE_PAD, lineY);
        ctx.lineTo(CANVAS_WIDTH - SIDE_PAD, lineY);
        ctx.stroke();
        y += extraGap;
      }
    }

    if (t.labelHeight > 0) {
      const labelText = (t.tier === 'PRESENTING' ? event.topTierLabel : TIER_LABELS[t.tier]).toUpperCase();
      ctx.font = `bold ${TIER_LABEL_FONT_SIZE}px "${FONT_BOLD}"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = event.accentColor || '#e8384f';
      ctx.fillText(labelText, CANVAS_WIDTH / 2, y, CANVAS_WIDTH - SIDE_PAD * 2);
      y += t.labelHeight;
    }

    for (const row of t.rows) {
      const innerCellWidth = t.cellWidth - CELL_INNER_PAD * 2;
      // Center the last (possibly partial) row.
      const rowOffsetX = ((t.columns - row.items.length) * (t.cellWidth + CELL_GAP)) / 2;

      row.items.forEach((item, col) => {
        const cellX = SIDE_PAD + rowOffsetX + col * (t.cellWidth + CELL_GAP);
        const innerX = cellX + CELL_INNER_PAD;
        const innerY = y + CELL_INNER_PAD;

        if (item.img) {
          const dx = innerX + (innerCellWidth - item.drawW) / 2;
          const dy = innerY + (row.innerHeight - item.drawH) / 2;
          ctx.drawImage(item.img, dx, dy, item.drawW, item.drawH);
        } else {
          drawPlaceholder(ctx, item.sponsor.companyName, innerX, innerY, innerCellWidth, row.innerHeight);
        }
      });

      y += row.innerHeight + CELL_INNER_PAD * 2;
    }
  });

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
