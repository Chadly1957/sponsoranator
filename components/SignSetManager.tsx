'use client';

import { useState } from 'react';
import SignEditModal from './SignEditModal';
import AddSignModal from './AddSignModal';
import type { SignSetDTO, SignDTO } from '@/lib/types';

export default function SignSetManager({ initialSignSet }: { initialSignSet: SignSetDTO }) {
  const [signSet, setSignSet] = useState(initialSignSet);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingSign, setEditingSign] = useState<SignDTO | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.set('file', file);
      const res = await fetch(`/api/sign-sets/${signSet.id}/import`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import sign list.');
      setSignSet((s) => ({ ...s, signs: [...s.signs, ...data.signs] }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setUploading(false);
    }
  }

  function onSignSaved(updated: SignDTO) {
    setSignSet((s) => ({ ...s, signs: s.signs.map((sign) => (sign.id === updated.id ? updated : sign)) }));
  }

  function onSignAdded(created: SignDTO) {
    setSignSet((s) => ({ ...s, signs: [...s.signs, created] }));
  }

  async function deleteSign(sign: SignDTO) {
    if (!confirm(`Remove the sign for "${sign.companyName}"?`)) return;
    setDeletingId(sign.id);
    try {
      const res = await fetch(`/api/sign-sets/${signSet.id}/signs/${sign.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSignSet((s) => ({ ...s, signs: s.signs.filter((x) => x.id !== sign.id) }));
      }
    } finally {
      setDeletingId(null);
    }
  }

  const readyCount = signSet.signs.filter((s) => s.status === 'ready').length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{signSet.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Template: {signSet.template?.name} · {signSet.signs.length} sign
            {signSet.signs.length === 1 ? '' : 's'} ({readyCount} ready)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setAdding(true)}
            disabled={!signSet.template || signSet.template.sizes.length === 0}
          >
            + Add sign
          </button>
          <label className="btn-secondary cursor-pointer">
            {uploading ? 'Importing…' : 'Upload sign list (.xlsx)'}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={uploading}
              onChange={importFile}
            />
          </label>
          <a href={`/api/sign-sets/${signSet.id}/export`} className="btn-primary">
            Download all (.zip)
          </a>
        </div>
      </div>

      {signSet.template && signSet.template.sizes.length === 0 && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          This template has no sizes yet — add one on the template's page before adding signs.
        </div>
      )}

      {uploadError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {uploadError}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Company</th>
              <th className="px-4 py-2">Sponsorship</th>
              <th className="px-4 py-2">Size</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {signSet.signs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No signs yet — upload a sign list to generate them.
                </td>
              </tr>
            )}
            {signSet.signs.map((sign) => (
              <tr key={sign.id}>
                <td className="px-4 py-2 font-medium text-gray-900">{sign.companyName}</td>
                <td className="px-4 py-2 text-gray-600">{sign.sponsorship}</td>
                <td className="px-4 py-2 text-gray-600">{sign.sizeLabel}</td>
                <td className="px-4 py-2">
                  {sign.status === 'ready' ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Ready
                    </span>
                  ) : (
                    <span
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                      title={sign.note ?? undefined}
                    >
                      Needs attention
                    </span>
                  )}
                  {sign.note && <p className="mt-1 text-xs text-gray-400">{sign.note}</p>}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    {sign.pdfPath && (
                      <a
                        href={`/api/sign-sets/${signSet.id}/signs/${sign.id}`}
                        className="btn-secondary px-2 py-1 text-xs"
                      >
                        Download
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn-secondary px-2 py-1 text-xs"
                      onClick={() => setEditingSign(sign)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-danger px-2 py-1 text-xs"
                      disabled={deletingId === sign.id}
                      onClick={() => deleteSign(sign)}
                    >
                      {deletingId === sign.id ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingSign && signSet.template && (
        <SignEditModal
          sign={editingSign}
          sizes={signSet.template.sizes}
          onClose={() => setEditingSign(null)}
          onSaved={onSignSaved}
        />
      )}

      {adding && signSet.template && (
        <AddSignModal
          signSetId={signSet.id}
          sizes={signSet.template.sizes}
          onClose={() => setAdding(false)}
          onAdded={onSignAdded}
        />
      )}
    </div>
  );
}
