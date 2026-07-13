'use client';

import { useMemo, useState } from 'react';
import LogoPicker, { LogoValue } from './LogoPicker';
import type { CompanyDTO } from '@/lib/types';

export default function CompanyLibrary({ initialCompanies }: { initialCompanies: CompanyDTO[] }) {
  const [companies, setCompanies] = useState<CompanyDTO[]>(initialCompanies);
  const [search, setSearch] = useState('');

  const [newName, setNewName] = useState('');
  const [newLogo, setNewLogo] = useState<LogoValue>({ file: null, url: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLogo, setEditLogo] = useState<LogoValue>({ file: null, url: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, search]);

  async function refresh() {
    const res = await fetch('/api/companies');
    const data = await res.json();
    if (res.ok) setCompanies(data.companies ?? []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      setCreateError('Company name is required.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const form = new FormData();
      form.set('name', newName.trim());
      if (newLogo.file) form.set('file', newLogo.file);
      if (newLogo.url) form.set('url', newLogo.url);
      const res = await fetch('/api/companies', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add company.');
      setNewName('');
      setNewLogo({ file: null, url: '' });
      await refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(company: CompanyDTO) {
    setEditingId(company.id);
    setEditName(company.name);
    setEditLogo({ file: null, url: '' });
    setEditError(null);
  }

  async function saveEdit(company: CompanyDTO) {
    setSavingEdit(true);
    setEditError(null);
    try {
      const form = new FormData();
      if (editName.trim() && editName.trim() !== company.name) form.set('name', editName.trim());
      if (editLogo.file) form.set('file', editLogo.file);
      if (editLogo.url) form.set('url', editLogo.url);
      const res = await fetch(`/api/companies/${company.id}`, { method: 'PATCH', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save.');
      setEditingId(null);
      await refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function remove(company: CompanyDTO) {
    if (
      !confirm(
        `Delete "${company.name}" from the library? This also removes it from any events using it.`
      )
    )
      return;
    await fetch(`/api/companies/${company.id}`, { method: 'DELETE' });
    await refresh();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Logo Library</h1>
        <p className="mt-1 text-sm text-gray-500">
          Companies and logos saved here can be reused across any event.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <form onSubmit={handleCreate} className="card space-y-4 p-5">
            <h3 className="font-semibold text-gray-900">Add a company</h3>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Company name</span>
              <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </label>
            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700">Logo (optional)</span>
              <LogoPicker onChange={setNewLogo} />
            </div>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? 'Adding…' : 'Add company'}
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2">
          <input
            className="input mb-4"
            placeholder="Search companies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="card divide-y divide-gray-100">
            {filtered.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-500">No companies found.</p>
            )}
            {filtered.map((company) => (
              <div key={company.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded border border-gray-200 bg-white">
                  {company.logoPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={company.logoPath}
                      alt={company.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="px-1 text-center text-[10px] text-gray-400">{company.name}</span>
                  )}
                </div>
                <div className="flex-1 font-medium text-gray-900">{company.name}</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary px-2 py-1 text-xs"
                    onClick={() => (editingId === company.id ? setEditingId(null) : startEdit(company))}
                  >
                    {editingId === company.id ? 'Cancel' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    className="btn-danger px-2 py-1 text-xs"
                    onClick={() => remove(company)}
                  >
                    Delete
                  </button>
                </div>

                {editingId === company.id && (
                  <div className="w-full space-y-3 rounded-md bg-gray-50 p-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-gray-700">Company name</span>
                      <input
                        className="input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </label>
                    <div>
                      <span className="mb-1 block text-xs font-medium text-gray-700">Replace logo</span>
                      <LogoPicker onChange={setEditLogo} currentPreview={company.logoPath} compact />
                    </div>
                    {editError && <p className="text-xs text-red-600">{editError}</p>}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => saveEdit(company)}
                        disabled={savingEdit}
                      >
                        {savingEdit ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
