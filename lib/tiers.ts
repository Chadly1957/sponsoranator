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
  GENERAL: { columns: 4, cellHeight: 85 },
};

export function tierRank(tier: string): number {
  const idx = TIER_ORDER.indexOf(tier as Tier);
  return idx === -1 ? TIER_ORDER.length : idx;
}
