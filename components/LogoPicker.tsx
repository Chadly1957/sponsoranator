'use client';

import { useEffect, useState } from 'react';
import CropModal from './CropModal';

export interface LogoValue {
  file: File | null;
  url: string;
}

interface Props {
  onChange: (value: LogoValue) => void;
  currentPreview?: string | null;
  compact?: boolean;
  /**
   * Seeds the URL field on mount (e.g. from an auto-find result). Give this component a
   * new `key` from the parent when updating it, since it's only read once, at mount time.
   */
  initialUrl?: string;
}

export default function LogoPicker({ onChange, currentPreview, compact, initialUrl }: Props) {
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState(initialUrl ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);

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

  function openCrop() {
    if (mode === 'file' && filePreview) {
      // A local object URL is already same-origin — no proxy needed.
      setCropSource(filePreview);
    } else if (mode === 'url' && url.trim()) {
      setCropSource(`/api/logo-proxy?url=${encodeURIComponent(url.trim())}`);
    } else if (currentPreview) {
      setCropSource(`/api/logo-proxy?url=${encodeURIComponent(currentPreview)}`);
    }
  }

  function handleCropped(croppedFile: File) {
    setFile(croppedFile);
    setMode('file');
    setCropSource(null);
  }

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
      {preview && (
        <div className="mt-2 flex items-center gap-2">
          <div
            className={`flex items-center justify-center rounded border border-gray-200 bg-white p-2 ${
              compact ? 'h-12 w-20' : 'h-20 w-40'
            }`}
          >
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
          <button
            type="button"
            onClick={openCrop}
            className="whitespace-nowrap text-xs font-medium text-brand hover:underline"
          >
            Crop
          </button>
        </div>
      )}
      {cropSource && (
        <CropModal imageSrc={cropSource} onCancel={() => setCropSource(null)} onCropped={handleCropped} />
      )}
    </div>
  );
}
