'use client';

import { useEffect, useRef, useState } from 'react';
import type { CompanyDTO } from '@/lib/types';

interface Props {
  value: CompanyDTO | null;
  onSelect: (company: CompanyDTO | null) => void;
  query: string;
  onQueryChange: (q: string) => void;
}

export default function CompanyCombobox({ value, onSelect, query, onQueryChange }: Props) {
  const [results, setResults] = useState<CompanyDTO[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value || !query.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const res = await fetch(`/api/companies?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) return;
      const data = await res.json();
      setResults(data.companies ?? []);
    }, 200);
    return () => clearTimeout(handle);
  }, [query, value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
        {value.logoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.logoPath} alt="" className="h-6 w-10 object-contain" />
        ) : (
          <span className="h-6 w-10 rounded bg-gray-200" />
        )}
        <span className="flex-1 font-medium">{value.name}</span>
        <button
          type="button"
          className="text-xs text-gray-500 hover:text-gray-800"
          onClick={() => onSelect(null)}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        className="input"
        placeholder="Search library or type a new company name"
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {results.map((c) => (
            <button
              type="button"
              key={c.id}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={() => {
                onSelect(c);
                setOpen(false);
              }}
            >
              {c.logoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logoPath} alt="" className="h-6 w-10 object-contain" />
              ) : (
                <span className="h-6 w-10 rounded bg-gray-100" />
              )}
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
