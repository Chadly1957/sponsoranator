import { prisma } from '@/lib/db';
import CompanyLibrary from '@/components/CompanyLibrary';

export const dynamic = 'force-dynamic';

export default async function CompaniesPage() {
  const companies = await prisma.company.findMany({ orderBy: { name: 'asc' } });
  return <CompanyLibrary initialCompanies={companies} />;
}
