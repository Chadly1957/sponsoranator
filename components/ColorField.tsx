'use client';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function ColorField({ label, value, onChange }: Props) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-gray-300 bg-white p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input font-mono"
        />
      </div>
    </label>
  );
}
