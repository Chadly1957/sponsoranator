'use client';

import { useState } from 'react';
import PdfBoxEditor from './PdfBoxEditor';
import type { SignTemplateDTO, SignTemplateSizeDTO } from '@/lib/types';

export default function SignTemplateEditor({ initialTemplate }: { initialTemplate: SignTemplateDTO }) {
  const [template, setTemplate] = useState<SignTemplateDTO>(initialTemplate);
  const [name, setName] = useState(template.name);
  const [savingName, setSavingName] = useState(false);

  const [newLabel, setNewLabel] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function saveName() {
    if (!name.trim() || name.trim() === template.name) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/sign-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (res.ok) setTemplate((t) => ({ ...t, name: data.template.name }));
    } finally {
      setSavingName(false);
    }
  }

  function updateSize(updated: SignTemplateSizeDTO) {
    setTemplate((t) => ({ ...t, sizes: t.sizes.map((s) => (s.id === updated.id ? updated : s)) }));
  }

  async function deleteSize(size: SignTemplateSizeDTO) {
    if (!confirm(`Delete the "${size.label}" size? This can't be undone.`)) return;
    const res = await fetch(`/api/sign-templates/${template.id}/sizes/${size.id}`, { method: 'DELETE' });
    if (res.ok) {
      setTemplate((t) => ({ ...t, sizes: t.sizes.filter((s) => s.id !== size.id) }));
    }
  }

  async function addSize(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim() || !newFile) {
      setAddError('A label and a PDF file are both required.');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const form = new FormData();
      form.set('label', newLabel.trim());
      form.set('file', newFile);
      const res = await fetch(`/api/sign-templates/${template.id}/sizes`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add size.');
      setTemplate((t) => ({ ...t, sizes: [...t.sizes, data.size] }));
      setNewLabel('');
      setNewFile(null);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <label className="block max-w-sm">
          <span className="mb-1 block text-sm font-medium text-gray-700">Template name</span>
          <div className="flex gap-2">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} />
            {savingName && <span className="self-center text-xs text-gray-400">Saving…</span>}
          </div>
        </label>
        <p className="mt-1 text-sm text-gray-500">
          Upload a blank PDF for each physical sign size you need (e.g. a small and a large
          version). Position the logo and text placeholders once here — they're reused every
          time you generate signs from this template.
        </p>
      </div>

      <div className="space-y-6">
        {template.sizes.map((size) => (
          <PdfBoxEditor key={size.id} size={size} onSaved={updateSize} onDelete={() => deleteSize(size)} />
        ))}
      </div>

      <form onSubmit={addSize} className="card mt-6 space-y-3 p-5">
        <h3 className="font-semibold text-gray-900">Add a size</h3>
        <label className="block max-w-sm">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Size label (must match the "Size" column in your sign list)
          </span>
          <input
            className="input"
            placeholder='e.g. "Small" or "Table Tent"'
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
        </label>
        <label className="block max-w-sm">
          <span className="mb-1 block text-sm font-medium text-gray-700">Blank PDF</span>
          <input
            type="file"
            accept="application/pdf"
            className="input"
            onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {addError && <p className="text-sm text-red-600">{addError}</p>}
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={adding}>
            {adding ? 'Adding…' : 'Add size'}
          </button>
        </div>
      </form>
    </div>
  );
}
