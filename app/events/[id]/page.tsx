import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { tierRank } from '@/lib/tiers';
import EventEditor from '@/components/EventEditor';

export const dynamic = 'force-dynamic';

export default async function EventPage({ params }: { params: { id: string } }) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { sponsors: { include: { company: true } } },
  });
  if (!event) notFound();

  const sponsors = [...event.sponsors].sort((a, b) => {
    const rankDiff = tierRank(a.tier) - tierRank(b.tier);
    return rankDiff !== 0 ? rankDiff : a.order - b.order;
  });

  return <EventEditor event={{ ...event, sponsors }} />;
}
