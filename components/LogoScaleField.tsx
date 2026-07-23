'use client';

import { LOGO_SCALE_MIN, LOGO_SCALE_MAX, LOGO_SCALE_STEP } from '@/lib/tiers';

interface Props {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
}

export default function LogoScaleField({ label, hint, value, onChange }: Props) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-medium text-gray-700">
        <span>{label}</span>
        <span className="font-mono text-gray-500">{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={LOGO_SCALE_MIN}
        max={LOGO_SCALE_MAX}
        step={LOGO_SCALE_STEP}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand"
      />
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>Smaller</span>
        <span>Larger</span>
      </div>
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}
