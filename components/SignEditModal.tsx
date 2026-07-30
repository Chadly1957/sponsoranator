'use client';

import { useState } from 'react';
import CompanyCombobox from './CompanyCombobox';
import type { CompanyDTO, SignDTO, SignTemplateSizeDTO } from '@/lib/types';

interface Props {
  sign: SignDTO;
  sizes: SignTemplateSizeDTO[];
  onClose: () => void;
  onSaved: (sign: SignDTO) => void;
}

export default function SignEditModal({ sign, sizes, onClose, onSaved }: Props) {
  const [company, setCompany] = useState<CompanyDTO | null>(sign.company);
  const [query, setQuery] = useState(sign.company ? '' : sign.companyName);
  const [sizeId, setSizeId] = useState(sign.templateSizeId ?? '');
  const [sponsorship, setSponsorship] = useState(sign.sponsorship);
  const [textOverride, setTextOverride] = useState(sign.textOverride ?? '');
  const [useOverride, setUseOverride] = useState(Boolean(sign.textOverride));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sign-sets/${sign.signSetId}/signs/${sign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company?.id ?? null,
          companyName: company ? company.name : query.trim() || sign.companyName,
          templateSizeId: sizeId || null,
          sponsorship,
          textOverride: useOverride ? textOverride : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save.');
      onSaved(data.sign);
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
          <h3 className="font-semibold text-gray-900">Edit sign</h3>
        </div>

        <div className="flex-1 space-y-4 overflow-auto p-5">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Company</span>
            <CompanyCombobox value={company} onSelect={setCompany} query={query} onQueryChange={setQuery} />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Sponsorship level</span>
            <input className="input" value={sponsorship} onChange={(e) => setSponsorship(e.target.value)} />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Sign size</span>
            <select className="input" value={sizeId} onChange={(e) => setSizeId(e.target.value)}>
              <option value="">— Select a size —</option>
              {sizes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={useOverride} onChange={(e) => setUseOverride(e.target.checked)} />
              Override the sign text manually
            </label>
            {useOverride && (
              <textarea
                className="input"
                rows={3}
                placeholder={'Custom text (one or more lines)'}
                value={textOverride}
                onChange={(e) => setTextOverride(e.target.value)}
              />
            )}
            {!useOverride && (
              <p className="text-xs text-gray-500">
                By default the sign shows the company name and sponsorship level.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save & regenerate'}
          </button>
        </div>
      </div>
    </div>
  );
}
