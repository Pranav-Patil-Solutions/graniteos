"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createQuote } from "@/actions/quotes";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/money";
import { GST_RATES } from "@/lib/validation";

type Customer = { id: string; name: string };
type Slab = { id: string; label: string; sqft: number; rateRupees: number };
type Item = {
  description: string;
  slabId: string;
  sqft: string;
  rateRupees: string;
  gstRate: string;
};

const blank = (): Item => ({ description: "", slabId: "", sqft: "", rateRupees: "", gstRate: "18" });

export default function QuoteBuilder({
  customers,
  slabs,
}: {
  customers: Customer[];
  slabs: Slab[];
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([blank()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setItem(i: number, patch: Partial<Item>) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addFromSlab(slabId: string) {
    const s = slabs.find((x) => x.id === slabId);
    if (!s) return;
    setItems((arr) => [
      ...arr,
      {
        description: s.label,
        slabId: s.id,
        sqft: String(s.sqft),
        rateRupees: String(s.rateRupees),
        gstRate: "18",
      },
    ]);
  }

  const rows = items.map((it) => {
    const sub = (Number(it.sqft) || 0) * (Number(it.rateRupees) || 0);
    const gst = (sub * (Number(it.gstRate) || 0)) / 100;
    return { sub, gst, total: sub + gst };
  });
  const subtotal = rows.reduce((n, r) => n + r.sub, 0);
  const gstTotal = rows.reduce((n, r) => n + r.gst, 0);
  const grand = subtotal + gstTotal;

  async function onSave() {
    setError("");
    setLoading(true);
    const res = await createQuote({
      customerId,
      validUntil,
      notes,
      items: items.map((it) => ({
        description: it.description,
        slabId: it.slabId,
        sqft: it.sqft,
        rateRupees: it.rateRupees || "0",
        gstRate: it.gstRate || "0",
      })),
    });
    if (res.error) {
      setLoading(false);
      return setError(res.error);
    }
    router.replace(`/quotes/${res.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <h1 className="text-2xl font-bold text-white">New quote</h1>

      <label className="block mt-4">
        <span className="text-xs font-medium text-slate-300">Customer</span>
        <select
          suppressHydrationWarning
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="mt-1 w-full text-base focus:border-gold outline-none"
        >
          <option value="">Select a customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {/* line items */}
      <div className="mt-5 space-y-3">
        {items.map((it, i) => (
          <div key={i} className="rounded-2xl border border-graphite-600 bg-white/[0.04] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                suppressHydrationWarning
                value={it.description}
                onChange={(e) => setItem(i, { description: e.target.value })}
                placeholder="Polished Black Galaxy slab"
                className="flex-1 text-sm focus:border-gold outline-none"
              />
              {items.length > 1 && (
                <button
                  onClick={() => setItems((arr) => arr.filter((_, idx) => idx !== i))}
                  className="text-slate-500 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <NumCell label="sq-ft" value={it.sqft} onChange={(v) => setItem(i, { sqft: v })} />
              <NumCell label="₹/sq-ft" value={it.rateRupees} onChange={(v) => setItem(i, { rateRupees: v })} />
              <label className="block">
                <span className="text-[10px] text-slate-400">GST %</span>
                <select
                  suppressHydrationWarning
                  value={it.gstRate}
                  onChange={(e) => setItem(i, { gstRate: e.target.value })}
                  className="mt-0.5 w-full !min-h-0 !py-1.5 text-sm bg-white/[0.04]"
                >
                  {GST_RATES.map((g) => (
                    <option key={g} value={g}>
                      {g}%
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="text-right text-xs text-slate-400">
              line: <span className="text-white font-semibold">{formatINR(Math.round(rows[i].total * 100))}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setItems((a) => [...a, blank()])}
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-graphite-500 px-3 py-2 text-sm text-slate-300 hover:border-gold hover:text-gold"
        >
          <Plus className="w-4 h-4" /> Add line
        </button>
        {slabs.length > 0 && (
          <select
            suppressHydrationWarning
            value=""
            onChange={(e) => {
              if (e.target.value) addFromSlab(e.target.value);
              e.target.value = "";
            }}
            className="rounded-lg border border-graphite-500 !min-h-0 !py-2 text-sm bg-white/[0.04] text-slate-300"
          >
            <option value="">+ Add slab from stock…</option>
            {slabs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} · {s.sqft} sqft
              </option>
            ))}
          </select>
        )}
      </div>

      {/* totals */}
      <div className="mt-5 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 space-y-1.5">
        <Row label="Subtotal" value={formatINR(Math.round(subtotal * 100))} />
        <Row label="GST" value={formatINR(Math.round(gstTotal * 100))} />
        <div className="flex justify-between pt-1.5 border-t border-graphite-600">
          <span className="font-bold text-white">Grand total</span>
          <span className="font-extrabold text-gold text-lg">{formatINR(Math.round(grand * 100))}</span>
        </div>
      </div>

      <label className="block mt-4">
        <span className="text-xs font-medium text-slate-300">Notes / terms (optional)</span>
        <input
          suppressHydrationWarning
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="50% advance, balance on delivery"
          className="mt-1 w-full text-base focus:border-gold outline-none"
        />
      </label>
      <label className="block mt-3">
        <span className="text-xs font-medium text-slate-300">Valid until (optional)</span>
        <input
          suppressHydrationWarning
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          className="mt-1 w-full text-base focus:border-gold outline-none"
        />
      </label>

      {error && (
        <div className="mt-4 rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
          {error}
        </div>
      )}
      <Button variant="press" className="w-full mt-4" disabled={loading} onClick={onSave}>
        {loading ? "Saving..." : "Save quote"}
      </Button>
    </div>
  );
}

function NumCell({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-slate-400">{label}</span>
      <input
        suppressHydrationWarning
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full !min-h-0 !py-1.5 text-sm focus:border-gold outline-none"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
