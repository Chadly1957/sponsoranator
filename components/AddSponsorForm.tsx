'use client';

import { useState } from 'react';
import CompanyCombobox from './CompanyCombobox';
import LogoPicker, { LogoValue } from './LogoPicker';
import { TIER_ORDER, TIER_LABELS, type Tier } from '@/lib/tiers';
import type { CompanyDTO } from '@/lib/types';

interface Props {
  eventId: string;
  onAdded: () => void;
}

export default function AddSponsorForm({ eventId, onAdded }: Props) {
  const [selected, setSelected] = useState<CompanyDTO | null>(null);
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<Tier>('GENERAL');
  const [logo, setLogo] = useState<LogoValue>({ file: null, url: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected && !query.trim()) {
      setError('Pick a company from the library or type a new company name.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('tier', tier);
      if (selected) {
        form.set('companyId', selected.id);
      } else {
        form.set('name', query.trim());
        if (logo.file) form.set('file', logo.file);
        if (logo.url) form.set('url', logo.url);
      }
      const res = await fetch(`/api/events/${eventId}/sponsors`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add sponsor.');
      setSelected(null);
      setQuery('');
      setLogo({ file: null, url: '' });
      setTier('GENERAL');
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-5">
      <h3 className="font-semibold text-gray-900">Add a sponsor</h3>

      <div>
        <span className="mb-1 block text-sm font-medium text-gray-700">Company</span>
        <CompanyCombobox value={selected} onSelect={setSelected} query={query} onQueryChange={setQuery} />
      </div>

      {!selected && query.trim() && (
        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700">
            New company logo (optional — add it later if you don&apos;t have it yet)
          </span>
          <LogoPicker onChange={setLogo} />
        </div>
      )}

      <div>
        <span className="mb-1 block text-sm font-medium text-gray-700">Sponsor level</span>
        <div className="flex flex-wrap gap-2">
          {TIER_ORDER.map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium ${
                tier === t
                  ? 'border-brand bg-brand text-white'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="tier"
                value={t}
                checked={tier === t}
                onChange={() => setTier(t)}
                className="sr-only"
              />
              {TIER_LABELS[t]}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add sponsor'}
        </button>
      </div>
    </form>
  );
}
