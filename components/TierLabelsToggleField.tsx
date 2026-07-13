'use client';

interface Props {
  value: boolean;
  onChange: (value: boolean) => void;
}

export default function TierLabelsToggleField({ value, onChange }: Props) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
      />
      <span>
        <span className="block text-sm font-medium text-gray-700">
          Show category labels on the image
        </span>
        <span className="block text-xs text-gray-500">
          Prints a label (e.g. &quot;Gold&quot;) above each tier&apos;s row — Presenting uses
          its top-tier label above, General never gets one.
        </span>
      </span>
    </label>
  );
}
