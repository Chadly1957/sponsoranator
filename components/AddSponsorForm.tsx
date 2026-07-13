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

  const [autoFinding, setAutoFinding] = useState(false);
  const [autoFindMessage, setAutoFindMessage] = useState<string | null>(null);
  const [discoveredUrl, setDiscoveredUrl] = useState<string | undefined>(undefined);
  const [pickerKey, setPickerKey] = useState(0);

  function handleQueryChange(next: string) {
    setQuery(next);
    setAutoFindMessage(null);
  }

  async function handleAutoFind() {
    if (!query.trim()) return;
    setAutoFinding(true);
    setAutoFindMessage(null);
    try {
      const res = await fetch('/api/logo-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lookup failed.');

      if (data.suggestedName) setQuery(data.suggestedName);

      if (data.url) {
        setDiscoveredUrl(data.url);
        setLogo({ file: null, url: data.url });
        setPickerKey((k) => k + 1);
        setAutoFindMessage(
          data.suggestedName
            ? 'Found a logo and company name below — double check them before adding.'
            : 'Found a logo below — double check it before adding.'
        );
      } else if (data.suggestedName) {
        setAutoFindMessage("Found the company name, but couldn't find a logo. Paste a URL or upload one below.");
      } else {
        setAutoFindMessage("Couldn't find a logo automatically. Paste a URL or upload one instead.");
      }
    } catch (err) {
      setAutoFindMessage(err instanceof Error ? err.message : 'Lookup failed.');
    } finally {
      setAutoFinding(false);
    }
  }

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
      setDiscoveredUrl(undefined);
      setAutoFindMessage(null);
      setPickerKey((k) => k + 1);
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
        <CompanyCombobox
          value={selected}
          onSelect={setSelected}
          query={query}
          onQueryChange={handleQueryChange}
        />
        {!selected && !query.trim() && (
          <p className="mt-1 text-xs text-gray-400">
            Tip: you can paste the company&apos;s website (e.g. acmetrucking.com) instead of typing a
            name — auto-find will fill in both the name and logo.
          </p>
        )}
      </div>

      {!selected && query.trim() && (
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="block text-sm font-medium text-gray-700">
              New company logo (optional — add it later if you don&apos;t have it yet)
            </span>
            <button
              type="button"
              onClick={handleAutoFind}
              disabled={autoFinding}
              className="shrink-0 whitespace-nowrap text-xs font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
            >
              {autoFinding ? 'Searching…' : 'Auto-find logo'}
            </button>
          </div>
          {autoFindMessage && <p className="mb-2 text-xs text-gray-500">{autoFindMessage}</p>}
          <LogoPicker key={pickerKey} onChange={setLogo} initialUrl={discoveredUrl} />
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
