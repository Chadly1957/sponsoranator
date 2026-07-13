export const TIER_ORDER = ['PRESENTING', 'GOLD', 'SILVER', 'BRONZE', 'GENERAL'] as const;

export type Tier = (typeof TIER_ORDER)[number];

export const TIER_LABELS: Record<Tier, string> = {
  PRESENTING: 'Presenting',
  GOLD: 'Gold',
  SILVER: 'Silver',
  BRONZE: 'Bronze',
  GENERAL: 'General',
};

// Columns per row and logo cell height (px, at render resolution) for each tier.
// Earlier tiers render larger and with fewer columns; later tiers pack tighter.
export const TIER_LAYOUT: Record<Tier, { columns: number; cellHeight: number }> = {
  PRESENTING: { columns: 1, cellHeight: 220 },
  GOLD: { columns: 2, cellHeight: 150 },
  SILVER: { columns: 3, cellHeight: 115 },
  BRONZE: { columns: 4, cellHeight: 95 },
  // 96.4 rather than a round 20% bump off 85: render.ts subtracts a fixed 28px of inner
  // padding before fitting the logo, so this is what makes the *fittable logo area* ~20%
  // bigger (not just the outer cell, which would understate the visible size increase).
  GENERAL: { columns: 4, cellHeight: 96.4 },
};

export function tierRank(tier: string): number {
  const idx = TIER_ORDER.indexOf(tier as Tier);
  return idx === -1 ? TIER_ORDER.length : idx;
}
