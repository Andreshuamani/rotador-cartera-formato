"use client";

import { useEffect, useRef, useState } from "react";

export interface EmpresaOption {
  id: string;
  nombre: string;
}

interface Props {
  onSelect: (empresa: EmpresaOption) => void;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function EmpresaCombobox({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<EmpresaOption[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<EmpresaOption | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const url = query
      ? `${API}/api/empresas?search=${encodeURIComponent(query)}`
      : `${API}/api/empresas`;

    fetch(url)
      .then((r) => r.json())
      .then((data: EmpresaOption[]) => setOptions(data))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [query, open]);

  function handleSelect(opt: EmpresaOption) {
    setSelected(opt);
    setQuery(opt.nombre);
    setOpen(false);
    onSelect(opt);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <input
        type="text"
        value={query}
        placeholder="Buscar empresa..."
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />

      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
          {loading && (
            <li className="px-3 py-2 text-sm text-zinc-400">Buscando...</li>
          )}
          {!loading && options.length === 0 && (
            <li className="px-3 py-2 text-sm text-zinc-400">Sin resultados</li>
          )}
          {!loading &&
            options.map((opt) => (
              <li
                key={opt.id}
                className={`cursor-pointer px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 ${
                  selected?.id === opt.id ? "bg-blue-50 font-semibold text-blue-700" : "text-zinc-700"
                }`}
                onMouseDown={() => handleSelect(opt)}
              >
                {opt.nombre}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
