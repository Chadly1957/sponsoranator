'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import type { SignSetDTO, SignTemplateDTO } from '@/lib/types';

export default function SignSetList({
  initialSignSets,
  templates,
}: {
  initialSignSets: SignSetDTO[];
  templates: SignTemplateDTO[];
}) {
  const router = useRouter();
  const [signSets, setSignSets] = useState(initialSignSets);
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!templateId) {
      setError('Choose a sign template.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/sign-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), templateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create sign set.');
      router.push(`/sign-sets/${data.signSet.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setCreating(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}" and all of its generated signs?`)) return;
    const res = await fetch(`/api/sign-sets/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSignSets((prev) => prev.filter((s) => s.id !== id));
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error || 'Failed to delete.');
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sign Creator</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a sign list (Sponsorship, Company, Size) and generate every sign for an event
          in one go, using a saved template and your logo library.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="card px-6 py-10 text-center">
          <p className="mb-3 text-gray-600">You need a sign template before creating a sign set.</p>
          <Link href="/sign-templates" className="btn-primary">
            Create a sign template
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form onSubmit={create} className="card h-fit space-y-3 p-5 lg:col-span-1">
            <h3 className="font-semibold text-gray-900">New sign set</h3>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Name</span>
              <input
                className="input"
                placeholder="e.g. 2026 Gala"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Sign template</span>
              <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>

          <div className="lg:col-span-2">
            <div className="card divide-y divide-gray-100">
              {signSets.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-gray-500">No sign sets yet.</p>
              )}
              {signSets.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <Link href={`/sign-sets/${s.id}`} className="font-medium text-gray-900 hover:text-brand">
                    {s.name}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{s.signs.length} sign{s.signs.length === 1 ? '' : 's'}</span>
                    <button type="button" className="btn-danger px-2 py-1 text-xs" onClick={() => remove(s.id, s.name)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
