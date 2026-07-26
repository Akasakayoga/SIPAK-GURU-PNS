import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, Building, X } from "lucide-react";

interface Option {
  id: string;
  name: string;
  npsn?: string;
}

interface SearchableSchoolSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowAll?: boolean;
  allLabel?: string;
}

export default function SearchableSchoolSelect({
  value,
  onChange,
  options,
  placeholder = "Pilih Unit Kerja Sekolah...",
  disabled = false,
  className = "",
  allowAll = true,
  allLabel = "Semua Sekolah"
}: SearchableSchoolSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      opt.name.toLowerCase().includes(q) ||
      (opt.npsn && opt.npsn.toLowerCase().includes(q)) ||
      opt.id.toLowerCase().includes(q)
    );
  });

  const selectedOption = options.find(opt => opt.name === value || opt.id === value);
  const displayValue = selectedOption ? selectedOption.name : (value || allLabel);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold flex items-center justify-between gap-2 transition-colors ${
          disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "cursor-pointer hover:border-teal-500 text-slate-700 bg-white shadow-2xs"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Building className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span className="truncate">{displayValue}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn">
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Cari nama sekolah / NPSN..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-800 font-semibold focus:outline-none placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {allowAll && (!query || allLabel.toLowerCase().includes(query.toLowerCase())) && (
              <div
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                  setQuery("");
                }}
                className={`p-2.5 text-xs font-bold cursor-pointer flex items-center justify-between transition-colors ${
                  !value ? "bg-teal-50 text-teal-700" : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span>{allLabel}</span>
                {!value && <Check className="w-3.5 h-3.5 text-teal-600" />}
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 font-medium italic">
                Sekolah tidak ditemukan...
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = value === opt.name || value === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      onChange(opt.name);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`p-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected ? "bg-teal-50 text-teal-800 font-bold" : "hover:bg-slate-50 text-slate-700 font-medium"
                    }`}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="truncate">{opt.name}</span>
                      {opt.npsn && <span className="text-[10px] text-slate-400 font-mono">NPSN: {opt.npsn}</span>}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
