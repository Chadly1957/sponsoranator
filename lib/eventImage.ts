import { prisma } from './db';
import { renderEventImage } from './render';

/** Fetches an event and renders its current sponsor-card PNG. Null if the event doesn't exist. */
export async function generateEventPng(
  eventId: string
): Promise<{ eventName: string; png: Buffer } | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { sponsors: { include: { company: true } } },
  });
  if (!event) return null;

  const png = await renderEventImage(
    {
      name: event.name,
      logoPath: event.logoPath,
      primaryColor: event.primaryColor,
      accentColor: event.accentColor,
      topTierLabel: event.topTierLabel,
      logosPerRow: event.logosPerRow,
      generalScale: event.generalScale,
      showTierLabels: event.showTierLabels,
      bronzeGeneralDivider: event.bronzeGeneralDivider,
    },
    event.sponsors.map((s) => ({
      id: s.id,
      companyName: s.company.name,
      logoPath: s.company.logoPath,
      tier: s.tier,
      order: s.order,
    }))
  );

  return { eventName: event.name, png };
}

export function slugifyFilename(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'event';
}
