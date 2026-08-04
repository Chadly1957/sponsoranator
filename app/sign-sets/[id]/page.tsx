import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import SignSetManager from '@/components/SignSetManager';

export const dynamic = 'force-dynamic';

export default async function SignSetPage({ params }: { params: { id: string } }) {
  const signSet = await prisma.signSet.findUnique({
    where: { id: params.id },
    include: {
      template: { include: { sizes: true } },
      signs: { include: { company: true }, orderBy: { order: 'asc' } },
    },
  });
  if (!signSet) notFound();

  return (
    <div>
      <Link href="/sign-sets" className="mb-4 inline-block text-sm text-gray-500 hover:text-brand">
        ← Sign sets
      </Link>
      <SignSetManager initialSignSet={signSet} />
    </div>
  );
}
