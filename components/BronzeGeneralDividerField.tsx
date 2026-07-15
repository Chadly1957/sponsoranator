'use client';

interface Props {
  value: boolean;
  onChange: (value: boolean) => void;
}

export default function BronzeGeneralDividerField({ value, onChange }: Props) {
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
          Divider between Bronze and General
        </span>
        <span className="block text-xs text-gray-500">
          Draws a thin line separating the Bronze row from the General row, when both are
          present.
        </span>
      </span>
    </label>
  );
}
