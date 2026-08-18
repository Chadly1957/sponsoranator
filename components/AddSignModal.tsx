'use client';

import { useState } from 'react';
import CompanyCombobox from './CompanyCombobox';
import type { CompanyDTO, SignDTO, SignTemplateSizeDTO } from '@/lib/types';

interface Props {
  signSetId: string;
  sizes: SignTemplateSizeDTO[];
  onClose: () => void;
  onAdded: (sign: SignDTO) => void;
}

export default function AddSignModal({ signSetId, sizes, onClose, onAdded }: Props) {
  const [company, setCompany] = useState<CompanyDTO | null>(null);
  const [query, setQuery] = useState('');
  const [sponsorship, setSponsorship] = useState('');
  const [sizeId, setSizeId] = useState(sizes[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!company && !query.trim()) {
      setError('Pick a company from the library, or type a company name.');
      return;
    }
    if (!sponsorship.trim()) {
      setError('Sponsorship title is required.');
      return;
    }
    if (!sizeId) {
      setError('Choose a sign size.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sign-sets/${signSetId}/signs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company?.id ?? null,
          companyName: company ? company.name : query.trim(),
          sponsorship: sponsorship.trim(),
          templateSizeId: sizeId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add sign.');
      onAdded(data.sign);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="font-semibold text-gray-900">Add a sign</h3>
        </div>

        <div className="flex-1 space-y-4 overflow-auto p-5">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Company (supplies the logo)</span>
            <CompanyCombobox value={company} onSelect={setCompany} query={query} onQueryChange={setQuery} />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Sponsorship title (printed on the sign)
            </span>
            <input
              className="input"
              placeholder='e.g. "Dinner Sponsor"'
              value={sponsorship}
              onChange={(e) => setSponsorship(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Sign size</span>
            <select className="input" value={sizeId} onChange={(e) => setSizeId(e.target.value)}>
              {sizes.length === 0 && <option value="">No sizes on this template</option>}
              {sizes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Adding…' : 'Add sign'}
          </button>
        </div>
      </div>
    </div>
  );
}
