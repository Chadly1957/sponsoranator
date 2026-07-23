export const TIER_ORDER = ['PRESENTING', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'GENERAL'] as const;

export type Tier = (typeof TIER_ORDER)[number];

export const TIER_LABELS: Record<Tier, string> = {
  PRESENTING: 'Presenting',
  PLATINUM: 'Platinum',
  GOLD: 'Gold',
  SILVER: 'Silver',
  BRONZE: 'Bronze',
  GENERAL: 'General',
};

// Base logo cell height (px, at render resolution) for each tier — earlier tiers render
// larger. GENERAL is further adjustable per-event via generalScale (see below).
// Columns per row are configurable per-event (see LOGOS_PER_ROW_OPTIONS / columnsForTier
// below); Presenting always stays a single solo row regardless of that setting.
export const TIER_CELL_HEIGHT: Record<Tier, number> = {
  PRESENTING: 220,
  PLATINUM: 185,
  GOLD: 150,
  SILVER: 115,
  BRONZE: 95,
  GENERAL: 85,
};

export const LOGOS_PER_ROW_OPTIONS = [2, 3, 4] as const;
export type LogosPerRow = (typeof LOGOS_PER_ROW_OPTIONS)[number];

export function clampLogosPerRow(value: number): LogosPerRow {
  if (value <= 2) return 2;
  if (value >= 4) return 4;
  return 3;
}

/** Columns per row for a tier, given the event's configured logos-per-row setting. */
export function columnsForTier(tier: Tier, logosPerRow: number): number {
  return tier === 'PRESENTING' ? 1 : clampLogosPerRow(logosPerRow);
}

export const GENERAL_SCALE_MIN = 0.5;
export const GENERAL_SCALE_MAX = 2;
export const GENERAL_SCALE_DEFAULT = 1.2;
export const GENERAL_SCALE_STEP = 0.05;

export function clampGeneralScale(value: number): number {
  if (Number.isNaN(value)) return GENERAL_SCALE_DEFAULT;
  return Math.min(GENERAL_SCALE_MAX, Math.max(GENERAL_SCALE_MIN, value));
}

/** Cell height for a tier, applying the event's General-size scale where relevant. */
export function cellHeightForTier(tier: Tier, generalScale: number): number {
  if (tier === 'GENERAL') return TIER_CELL_HEIGHT.GENERAL * clampGeneralScale(generalScale);
  return TIER_CELL_HEIGHT[tier];
}

// Manual per-logo size multiplier, used both as a company's library-wide default
// (Company.logoScale) and as a per-sponsorship override (EventSponsor.scale) — the two
// multiply together to get the logo's final effective size in a given event image.
export const LOGO_SCALE_MIN = 0.5;
export const LOGO_SCALE_MAX = 2;
export const LOGO_SCALE_DEFAULT = 1;
export const LOGO_SCALE_STEP = 0.05;

export function clampLogoScale(value: number): number {
  if (Number.isNaN(value)) return LOGO_SCALE_DEFAULT;
  return Math.min(LOGO_SCALE_MAX, Math.max(LOGO_SCALE_MIN, value));
}

export function tierRank(tier: string): number {
  const idx = TIER_ORDER.indexOf(tier as Tier);
  return idx === -1 ? TIER_ORDER.length : idx;
}
