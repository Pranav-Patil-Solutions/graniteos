"use client";

// FilterChips — pill dropdown chips (Color ▾, Type ▾, Size ▾). Dark elevated,
// gold border when a value is active. Spec §3.11.
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FilterChip({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = value !== "";
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
          active ? "border-gold text-gold bg-gold/10" : "border-line-dark text-ondark-muted bg-shell-elevated"
        }`}
      >
        {active ? value : label}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute left-0 mt-1 z-20 min-w-[140px] rounded-xl border border-line-dark bg-shell-elevated2 p-1 shadow-slab">
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            className={`block w-full text-left rounded-lg px-3 py-2 text-[13px] ${value === "" ? "text-gold" : "text-ondark-muted hover:text-ondark"}`}
          >
            All {label.toLowerCase()}
          </button>
          {options.map((o) => (
            <button
              key={o}
              onClick={() => { onChange(o); setOpen(false); }}
              className={`block w-full text-left rounded-lg px-3 py-2 text-[13px] ${o === value ? "text-gold" : "text-ondark-muted hover:text-ondark"}`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FilterChipsRow({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">{children}</div>;
}
