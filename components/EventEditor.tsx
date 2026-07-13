'use client';

import { useState } from 'react';
import LogoPicker, { LogoValue } from './LogoPicker';
import ColorField from './ColorField';
import AddSponsorForm from './AddSponsorForm';
import SponsorRow from './SponsorRow';
import { TIER_ORDER, TIER_LABELS } from '@/lib/tiers';
import type { EventDTO, EventSponsorDTO } from '@/lib/types';

export default function EventEditor({ event: initialEvent }: { event: EventDTO }) {
  const [event, setEvent] = useState(initialEvent);
  // Starts at 0 (stable across server/client render) so hydration matches;
  // bumped to Date.now() only after a mutation to bust the <img> cache.
  const [imgTs, setImgTs] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [name, setName] = useState(initialEvent.name);
  const [primaryColor, setPrimaryColor] = useState(initialEvent.primaryColor);
  const [accentColor, setAccentColor] = useState(initialEvent.accentColor);
  const [topTierLabel, setTopTierLabel] = useState(initialEvent.topTierLabel);
  const [logo, setLogo] = useState<LogoValue>({ file: null, url: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/events/${event.id}`, { cache: 'no-store' });
    const data = await res.json();
    if (res.ok) setEvent(data.event);
    setImgTs(Date.now());
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsError(null);
    try {
      const form = new FormData();
      if (name.trim()) form.set('name', name.trim());
      form.set('primaryColor', primaryColor);
      form.set('accentColor', accentColor);
      form.set('topTierLabel', topTierLabel);
      if (logo.file) form.set('file', logo.file);
      if (logo.url) form.set('url', logo.url);
      const res = await fetch(`/api/events/${event.id}`, { method: 'PATCH', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save.');
      setLogo({ file: null, url: '' });
      await refresh();
      setSettingsOpen(false);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSavingSettings(false);
    }
  }

  const grouped: Record<string, EventSponsorDTO[]> = {};
  for (const tier of TIER_ORDER) grouped[tier] = event.sponsors.filter((s) => s.tier === tier);

  async function moveSponsor(tier: string, index: number, direction: 'up' | 'down') {
    const list = grouped[tier];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (!list || swapIndex < 0 || swapIndex >= list.length) return;
    const a = list[index];
    const b = list[swapIndex];
    await Promise.all([
      fetch(`/api/events/${event.id}/sponsors/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: b.order }),
      }),
      fetch(`/api/events/${event.id}/sponsors/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: a.order }),
      }),
    ]);
    await refresh();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {event.sponsors.length} sponsor{event.sponsors.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn-secondary" href={`/api/events/${event.id}/image?download=1`}>
            Download PNG
          </a>
          <a className="btn-secondary" href={`/api/events/${event.id}/export`}>
            Export logos (.zip)
          </a>
          <button type="button" className="btn-primary" onClick={() => setSettingsOpen((v) => !v)}>
            {settingsOpen ? 'Close settings' : 'Event settings'}
          </button>
        </div>
      </div>

      {settingsOpen && (
        <form onSubmit={saveSettings} className="card mb-6 space-y-5 p-6">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Event name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Top-tier sponsor label</span>
            <input
              className="input"
              value={topTierLabel}
              onChange={(e) => setTopTierLabel(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <ColorField label="Border / header color" value={primaryColor} onChange={setPrimaryColor} />
            <ColorField label="Accent color" value={accentColor} onChange={setAccentColor} />
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">Event logo</span>
            <LogoPicker onChange={setLogo} currentPreview={event.logoPath} />
          </div>
          {settingsError && <p className="text-sm text-red-600">{settingsError}</p>}
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={savingSettings}>
              {savingSettings ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <AddSponsorForm eventId={event.id} onAdded={refresh} />
        </div>

        <div className="space-y-6 lg:col-span-3">
          <div className="card overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-3">
              <h3 className="font-semibold text-gray-900">Live preview</h3>
            </div>
            <div className="flex justify-center bg-gray-50 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/events/${event.id}/image?ts=${imgTs}`}
                alt={`${event.name} sponsor image`}
                className="max-w-full rounded"
              />
            </div>
          </div>

          {TIER_ORDER.map((tier) => {
            const list = grouped[tier];
            if (!list || list.length === 0) return null;
            return (
              <div key={tier} className="card overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-3">
                  <h3 className="font-semibold text-gray-900">
                    {tier === 'PRESENTING' ? event.topTierLabel : TIER_LABELS[tier]}
                    <span className="ml-2 text-xs font-normal text-gray-400">{list.length}</span>
                  </h3>
                </div>
                <div>
                  {list.map((sponsor, index) => (
                    <SponsorRow
                      key={sponsor.id}
                      eventId={event.id}
                      sponsor={sponsor}
                      canMoveUp={index > 0}
                      canMoveDown={index < list.length - 1}
                      onMove={(direction) => moveSponsor(tier, index, direction)}
                      onChanged={refresh}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {event.sponsors.length === 0 && (
            <div className="card px-6 py-10 text-center text-gray-500">
              No sponsors yet. Add your first one on the left.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
