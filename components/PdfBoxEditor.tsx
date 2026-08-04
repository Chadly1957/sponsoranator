'use client';

import { useRef, useState } from 'react';
import DraggableBox, { type PctBox } from './DraggableBox';
import type { SignTemplateSizeDTO } from '@/lib/types';

interface Props {
  size: SignTemplateSizeDTO;
  onSaved: (size: SignTemplateSizeDTO) => void;
  onDelete: () => void;
}

function toPct(box: { x: number; y: number; w: number; h: number }, pageWidth: number, pageHeight: number): PctBox {
  return {
    x: (box.x / pageWidth) * 100,
    y: (box.y / pageHeight) * 100,
    w: (box.w / pageWidth) * 100,
    h: (box.h / pageHeight) * 100,
  };
}

function toPt(box: PctBox, pageWidth: number, pageHeight: number) {
  return {
    x: (box.x / 100) * pageWidth,
    y: (box.y / 100) * pageHeight,
    w: (box.w / 100) * pageWidth,
    h: (box.h / 100) * pageHeight,
  };
}

export default function PdfBoxEditor({ size, onSaved, onDelete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [textBox, setTextBox] = useState<PctBox>(
    toPct({ x: size.textBoxX, y: size.textBoxY, w: size.textBoxW, h: size.textBoxH }, size.pageWidth, size.pageHeight)
  );
  const [logoBox, setLogoBox] = useState<PctBox>(
    toPct({ x: size.logoBoxX, y: size.logoBoxY, w: size.logoBoxW, h: size.logoBoxH }, size.pageWidth, size.pageHeight)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const aspect = size.pageWidth / size.pageHeight;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const textPt = toPt(textBox, size.pageWidth, size.pageHeight);
      const logoPt = toPt(logoBox, size.pageWidth, size.pageHeight);
      const res = await fetch(`/api/sign-templates/${size.templateId}/sizes/${size.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textBoxX: textPt.x,
          textBoxY: textPt.y,
          textBoxW: textPt.w,
          textBoxH: textPt.h,
          logoBoxX: logoPt.x,
          logoBoxY: logoPt.y,
          logoBoxW: logoPt.w,
          logoBoxH: logoPt.h,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save layout.');
      onSaved(data.size);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">{size.label}</h4>
        <button type="button" className="btn-danger px-2 py-1 text-xs" onClick={onDelete}>
          Delete size
        </button>
      </div>

      <p className="mb-2 text-xs text-gray-500">
        Drag the boxes to position them, drag the corner handle to resize. The PDF preview below
        may show its own zoom controls — positions are saved in the underlying page's real
        dimensions, so use a generated sign to double-check exact placement.
      </p>

      <div
        ref={containerRef}
        className="relative mx-auto w-full max-w-md overflow-hidden border border-gray-300 bg-gray-100"
        style={{ aspectRatio: `${aspect}` }}
      >
        <object
          data={`${size.pdfPath}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          type="application/pdf"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <span className="flex h-full items-center justify-center text-xs text-gray-400">
            PDF preview unavailable in this browser.
          </span>
        </object>
        <DraggableBox
          box={logoBox}
          onChange={(b) => {
            setLogoBox(b);
            setDirty(true);
          }}
          containerRef={containerRef}
          label="Logo"
          color="#2563eb"
        />
        <DraggableBox
          box={textBox}
          onChange={(b) => {
            setTextBox(b);
            setDirty(true);
          }}
          containerRef={containerRef}
          label="Text"
          color="#e8384f"
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex justify-end">
        <button type="button" className="btn-primary" onClick={save} disabled={saving || !dirty}>
          {saving ? 'Saving…' : dirty ? 'Save layout' : 'Saved'}
        </button>
      </div>
    </div>
  );
}
