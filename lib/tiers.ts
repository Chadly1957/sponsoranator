export const TIER_ORDER = ['PRESENTING', 'GOLD', 'SILVER', 'BRONZE', 'GENERAL'] as const;

export type Tier = (typeof TIER_ORDER)[number];

export const TIER_LABELS: Record<Tier, string> = {
  PRESENTING: 'Presenting',
  GOLD: 'Gold',
  SILVER: 'Silver',
  BRONZE: 'Bronze',
  GENERAL: 'General',
};

// Logo cell height (px, at render resolution) for each tier — earlier tiers render larger.
// Columns per row are configurable per-event (see LOGOS_PER_ROW_OPTIONS / columnsForTier
// below); Presenting always stays a single solo row regardless of that setting.
export const TIER_CELL_HEIGHT: Record<Tier, number> = {
  PRESENTING: 220,
  GOLD: 150,
  SILVER: 115,
  BRONZE: 95,
  // 96.4 rather than a round 20% bump off 85: render.ts subtracts a fixed 28px of inner
  // padding before fitting the logo, so this is what makes the *fittable logo area* ~20%
  // bigger (not just the outer cell, which would understate the visible size increase).
  GENERAL: 96.4,
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

export function tierRank(tier: string): number {
  const idx = TIER_ORDER.indexOf(tier as Tier);
  return idx === -1 ? TIER_ORDER.length : idx;
}
