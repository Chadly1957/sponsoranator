'use client';

import { useEffect, useState } from 'react';

export interface LogoValue {
  file: File | null;
  url: string;
}

interface Props {
  onChange: (value: LogoValue) => void;
  currentPreview?: string | null;
  compact?: boolean;
}

export default function LogoPicker({ onChange, currentPreview, compact }: Props) {
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setFilePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setFilePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    onChange({ file: mode === 'file' ? file : null, url: mode === 'url' ? url : '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, url, file]);

  const preview = mode === 'file' ? filePreview : url || currentPreview || null;

  return (
    <div>
      <div className="mb-2 flex gap-2 text-xs font-medium">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`rounded px-2 py-1 ${mode === 'url' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Paste URL
        </button>
        <button
          type="button"
          onClick={() => setMode('file')}
          className={`rounded px-2 py-1 ${mode === 'file' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Upload file
        </button>
      </div>
      {mode === 'url' ? (
        <input
          type="url"
          placeholder="https://example.com/logo.png"
          className="input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      ) : (
        <input
          type="file"
          accept="image/*"
          className="input"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      )}
      {preview && !compact && (
        <div className="mt-2 flex h-20 w-40 items-center justify-center rounded border border-gray-200 bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Logo preview"
            className="max-h-full max-w-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
}
