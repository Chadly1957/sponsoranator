import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const events = await prisma.event.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { sponsors: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage sponsor images for each of your events.
          </p>
        </div>
        <Link href="/events/new" className="btn-primary">
          + New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="text-gray-500">No events yet.</p>
          <Link href="/events/new" className="btn-primary">
            Create your first event
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="card flex flex-col overflow-hidden transition-shadow hover:shadow-md"
            >
              <div
                className="flex h-32 items-center justify-center p-4"
                style={{ backgroundColor: event.primaryColor }}
              >
                {event.logoPath ? (
                  <Image
                    src={event.logoPath}
                    alt={event.name}
                    width={200}
                    height={100}
                    unoptimized
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-center text-lg font-bold text-white">{event.name}</span>
                )}
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="truncate font-medium text-gray-900">{event.name}</span>
                <span className="whitespace-nowrap text-xs text-gray-500">
                  {event._count.sponsors} sponsor{event._count.sponsors === 1 ? '' : 's'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
