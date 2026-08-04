import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import SignTemplateEditor from '@/components/SignTemplateEditor';

export const dynamic = 'force-dynamic';

export default async function SignTemplatePage({ params }: { params: { id: string } }) {
  const template = await prisma.signTemplate.findUnique({
    where: { id: params.id },
    include: { sizes: { orderBy: { createdAt: 'asc' } } },
  });
  if (!template) notFound();

  return (
    <div>
      <Link href="/sign-templates" className="mb-4 inline-block text-sm text-gray-500 hover:text-brand">
        ← Sign templates
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{template.name}</h1>
      <SignTemplateEditor initialTemplate={template} />
    </div>
  );
}
