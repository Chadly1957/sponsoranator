'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import type { SignTemplateDTO } from '@/lib/types';

export default function SignTemplateList({ initialTemplates }: { initialTemplates: SignTemplateDTO[] }) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Template name is required.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/sign-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create template.');
      router.push(`/sign-templates/${data.template.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setCreating(false);
    }
  }

  async function remove(template: SignTemplateDTO) {
    if (!confirm(`Delete "${template.name}"? This can't be undone.`)) return;
    const res = await fetch(`/api/sign-templates/${template.id}`, { method: 'DELETE' });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error || 'Failed to delete template.');
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sign Templates</h1>
        <p className="mt-1 text-sm text-gray-500">
          Blank sign designs, saved once and reused for every event. Each template can hold
          multiple physical sizes with their own logo/text placeholders.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form onSubmit={create} className="card h-fit space-y-3 p-5 lg:col-span-1">
          <h3 className="font-semibold text-gray-900">New template</h3>
          <input
            className="input"
            placeholder="e.g. Gala Sponsor Sign"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>

        <div className="lg:col-span-2">
          <div className="card divide-y divide-gray-100">
            {templates.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-500">No sign templates yet.</p>
            )}
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <Link href={`/sign-templates/${t.id}`} className="font-medium text-gray-900 hover:text-brand">
                  {t.name}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {t.sizes.length} size{t.sizes.length === 1 ? '' : 's'}
                  </span>
                  <button type="button" className="btn-danger px-2 py-1 text-xs" onClick={() => remove(t)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
