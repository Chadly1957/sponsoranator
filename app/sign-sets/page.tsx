import { prisma } from '@/lib/db';
import SignSetList from '@/components/SignSetList';

export const dynamic = 'force-dynamic';

export default async function SignSetsPage() {
  const [signSets, templates] = await Promise.all([
    prisma.signSet.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { signs: { include: { company: true } } },
    }),
    prisma.signTemplate.findMany({ orderBy: { updatedAt: 'desc' }, include: { sizes: true } }),
  ]);

  return <SignSetList initialSignSets={signSets} templates={templates} />;
}
