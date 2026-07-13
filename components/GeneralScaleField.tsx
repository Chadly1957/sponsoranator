'use client';

import { GENERAL_SCALE_MIN, GENERAL_SCALE_MAX, GENERAL_SCALE_STEP } from '@/lib/tiers';

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export default function GeneralScaleField({ value, onChange }: Props) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700">
        <span>General logo size</span>
        <span className="font-mono text-gray-500">{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={GENERAL_SCALE_MIN}
        max={GENERAL_SCALE_MAX}
        step={GENERAL_SCALE_STEP}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand"
      />
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>Smaller</span>
        <span>Larger</span>
      </div>
      <span className="mt-1 block text-xs text-gray-500">
        Scales only the General-tier logo cells; other levels are unaffected.
      </span>
    </label>
  );
}
