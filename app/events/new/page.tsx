'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LogoPicker, { LogoValue } from '@/components/LogoPicker';
import ColorField from '@/components/ColorField';
import LogosPerRowField from '@/components/LogosPerRowField';
import GeneralScaleField from '@/components/GeneralScaleField';
import TierLabelsToggleField from '@/components/TierLabelsToggleField';
import BronzeGeneralDividerField from '@/components/BronzeGeneralDividerField';

export default function NewEventPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0a2f5c');
  const [accentColor, setAccentColor] = useState('#e8384f');
  const [topTierLabel, setTopTierLabel] = useState('Presenting Sponsors');
  const [logosPerRow, setLogosPerRow] = useState(4);
  const [generalScale, setGeneralScale] = useState(1.2);
  const [showTierLabels, setShowTierLabels] = useState(false);
  const [bronzeGeneralDivider, setBronzeGeneralDivider] = useState(false);
  const [logo, setLogo] = useState<LogoValue>({ file: null, url: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Event name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('name', name.trim());
      form.set('primaryColor', primaryColor);
      form.set('accentColor', accentColor);
      form.set('topTierLabel', topTierLabel);
      form.set('logosPerRow', String(logosPerRow));
      form.set('generalScale', String(generalScale));
      form.set('showTierLabels', String(showTierLabels));
      form.set('bronzeGeneralDivider', String(bronzeGeneralDivider));
      if (logo.file) form.set('file', logo.file);
      if (logo.url) form.set('url', logo.url);

      const res = await fetch('/api/events', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create event.');
      router.refresh();
      router.push(`/events/${data.event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Event</h1>
      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Event name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ITA Golf Classic"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Top-tier sponsor label
          </span>
          <input
            className="input"
            value={topTierLabel}
            onChange={(e) => setTopTierLabel(e.target.value)}
            placeholder="Presenting Sponsors or Golf Level Sponsors"
          />
          <span className="mt-1 block text-xs text-gray-500">
            Used in the sponsor list, and printed on the image above Presenting sponsors if
            category labels are turned on below.
          </span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <ColorField label="Border / header color" value={primaryColor} onChange={setPrimaryColor} />
          <ColorField label="Accent color" value={accentColor} onChange={setAccentColor} />
        </div>

        <LogosPerRowField value={logosPerRow} onChange={setLogosPerRow} />

        <GeneralScaleField value={generalScale} onChange={setGeneralScale} />

        <TierLabelsToggleField value={showTierLabels} onChange={setShowTierLabels} />

        <BronzeGeneralDividerField value={bronzeGeneralDivider} onChange={setBronzeGeneralDivider} />

        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700">Event logo (optional)</span>
          <LogoPicker onChange={setLogo} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create event'}
          </button>
        </div>
      </form>
    </div>
  );
}
