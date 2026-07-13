'use client';

import { useState } from 'react';
import LogoPicker, { LogoValue } from './LogoPicker';
import { TIER_ORDER, TIER_LABELS } from '@/lib/tiers';
import type { EventSponsorDTO } from '@/lib/types';

interface Props {
  eventId: string;
  sponsor: EventSponsorDTO;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChanged: () => void;
  onMove: (direction: 'up' | 'down') => void;
}

export default function SponsorRow({
  eventId,
  sponsor,
  canMoveUp,
  canMoveDown,
  onChanged,
  onMove,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(sponsor.company.name);
  const [logo, setLogo] = useState<LogoValue>({ file: null, url: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveCompany() {
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      if (name.trim() && name.trim() !== sponsor.company.name) form.set('name', name.trim());
      if (logo.file) form.set('file', logo.file);
      if (logo.url) form.set('url', logo.url);
      const res = await fetch(`/api/companies/${sponsor.companyId}`, { method: 'PATCH', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update company.');
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function changeTier(tier: string) {
    await fetch(`/api/events/${eventId}/sponsors/${sponsor.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
    });
    onChanged();
  }

  async function remove() {
    if (!confirm(`Remove ${sponsor.company.name} from this event?`)) return;
    await fetch(`/api/events/${eventId}/sponsors/${sponsor.id}`, { method: 'DELETE' });
    onChanged();
  }

  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center">
      <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded border border-gray-200 bg-white">
        {sponsor.company.logoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sponsor.company.logoPath}
            alt={sponsor.company.name}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="px-1 text-center text-[10px] text-gray-400">{sponsor.company.name}</span>
        )}
      </div>

      <div className="flex-1">
        <p className="font-medium text-gray-900">{sponsor.company.name}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={sponsor.tier}
          onChange={(e) => changeTier(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        >
          {TIER_ORDER.map((t) => (
            <option key={t} value={t}>
              {TIER_LABELS[t]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-secondary px-2 py-1 text-xs"
          disabled={!canMoveUp}
          onClick={() => onMove('up')}
        >
          ↑
        </button>
        <button
          type="button"
          className="btn-secondary px-2 py-1 text-xs"
          disabled={!canMoveDown}
          onClick={() => onMove('down')}
        >
          ↓
        </button>
        <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setEditing((v) => !v)}>
          Edit
        </button>
        <button type="button" className="btn-danger px-2 py-1 text-xs" onClick={remove}>
          Remove
        </button>
      </div>

      {editing && (
        <div className="w-full space-y-3 rounded-md bg-gray-50 p-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-700">Company name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div>
            <span className="mb-1 block text-xs font-medium text-gray-700">Replace logo</span>
            <LogoPicker onChange={setLogo} currentPreview={sponsor.company.logoPath} compact />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={saveCompany} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
