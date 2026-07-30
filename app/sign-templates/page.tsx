import { prisma } from '@/lib/db';
import SignTemplateList from '@/components/SignTemplateList';

export const dynamic = 'force-dynamic';

export default async function SignTemplatesPage() {
  const templates = await prisma.signTemplate.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { sizes: true },
  });
  return <SignTemplateList initialTemplates={templates} />;
}
