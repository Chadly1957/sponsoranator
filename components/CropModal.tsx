'use client';

import { useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop, cropToCanvas } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface Props {
  imageSrc: string;
  onCancel: () => void;
  onCropped: (file: File) => void;
}

const FULL_IMAGE_CROP: Crop = { unit: '%', x: 2, y: 2, width: 96, height: 96 };

export default function CropModal({ imageSrc, onCancel, onCropped }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>(FULL_IMAGE_CROP);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applyCrop() {
    const image = imgRef.current;
    if (!image || !completedCrop || completedCrop.width < 1 || completedCrop.height < 1) {
      setError('Drag a crop area first.');
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const canvas = document.createElement('canvas');
      await cropToCanvas(image, canvas, completedCrop);
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('empty-blob');
      onCropped(new File([blob], 'cropped-logo.png', { type: 'image/png' }));
    } catch {
      setError('Something went wrong cropping that image. Try again, or upload the file directly.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-lg bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="font-semibold text-gray-900">Crop logo</h3>
          <p className="text-xs text-gray-500">Drag the corners to adjust, then apply.</p>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 p-4">
          {loadError ? (
            <p className="py-12 text-center text-sm text-red-600">
              Couldn&apos;t load that image for cropping.
            </p>
          ) : (
            <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} onComplete={setCompletedCrop}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Logo to crop"
                onError={() => setLoadError(true)}
                className="max-h-[60vh] max-w-full"
              />
            </ReactCrop>
          )}
        </div>

        {error && <p className="px-5 pt-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={applyCrop} disabled={processing || loadError}>
            {processing ? 'Applying…' : 'Apply crop'}
          </button>
        </div>
      </div>
    </div>
  );
}
