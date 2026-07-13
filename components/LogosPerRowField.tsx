'use client';

import { LOGOS_PER_ROW_OPTIONS } from '@/lib/tiers';

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export default function LogosPerRowField({ value, onChange }: Props) {
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-gray-700">Logos per row</span>
      <div className="flex gap-2">
        {LOGOS_PER_ROW_OPTIONS.map((n) => (
          <label
            key={n}
            className={`cursor-pointer rounded-md border px-4 py-2 text-sm font-medium ${
              value === n
                ? 'border-brand bg-brand text-white'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="logosPerRow"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            {n}
          </label>
        ))}
      </div>
      <span className="mt-1 block text-xs text-gray-500">
        Applies to all sponsor rows except Presenting, which always gets its own row.
      </span>
    </div>
  );
}
