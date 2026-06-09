"use client";

// Slab-style numeric inputs: light surface, right-aligned tabular numerals,
// unit suffix. MoneyInput (₹ prefix) + QtyInput (unit suffix). Spec §3.8.

function Base({
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  label?: string;
}) {
  return (
    <label className="block">
      {label && <span className="block text-[12px] font-medium text-onlight-muted mb-1">{label}</span>}
      <div className="flex items-center gap-1.5 rounded-xl bg-white border border-line-light px-3 h-11 focus-within:ring-2 focus-within:ring-gold">
        {prefix && <span className="text-onlight-muted text-sm">{prefix}</span>}
        <input
          suppressHydrationWarning
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent text-right text-onlight text-base font-semibold tnum outline-none border-0 !min-h-0 !p-0 !h-auto placeholder:text-onlight-muted/50"
        />
        {suffix && <span className="text-onlight-muted text-[12px] shrink-0">{suffix}</span>}
      </div>
    </label>
  );
}

export function MoneyInput(props: { value: string; onChange: (v: string) => void; label?: string; placeholder?: string }) {
  return <Base {...props} prefix="₹" />;
}

export function QtyInput(props: { value: string; onChange: (v: string) => void; unit?: string; label?: string; placeholder?: string }) {
  return <Base {...props} suffix={props.unit ?? "sq ft"} />;
}
