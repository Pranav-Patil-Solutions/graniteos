"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createQuote, updateQuote } from "@/actions/quotes";
import { Button } from "@/components/ui/Button";
import MicDictate from "@/components/voice/MicDictate";
import { formatINR } from "@/lib/money";
import { GST_RATES, UOM, DEFAULT_UOM } from "@/lib/validation";
import { DEFAULT_HSN } from "@/lib/gst";

type Customer = { id: string; name: string };
type Slab = { id: string; label: string; sqft: number; rateRupees: number };
export type Product = {
  id: string;
  name: string;
  hsn: string | null;
  uom: string;
  rateRupees: number;
  gstRate: number;
};
type Item = {
  description: string;
  slabId: string;
  productId: string;
  hsn: string;
  uom: string;
  sqft: string;
  rateRupees: string;
  gstRate: string;
};

export type QuoteInitial = {
  customerId: string;
  validUntil: string;
  notes: string;
  items: Item[];
};

const blank = (): Item => ({
  description: "",
  slabId: "",
  productId: "",
  hsn: DEFAULT_HSN,
  uom: DEFAULT_UOM,
  sqft: "",
  rateRupees: "",
  gstRate: "18",
});

export default function QuoteBuilder({
  customers,
  slabs,
  products = [],
  quoteId,
  initial,
}: {
  customers: Customer[];
  slabs: Slab[];
  products?: Product[];
  quoteId?: string;
  initial?: QuoteInitial;
}) {
  const router = useRouter();
  const editing = !!quoteId;
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [items, setItems] = useState<Item[]>(
    initial?.items?.length ? initial.items : [blank()],
  );
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
      { ...blank(), description: s.label, slabId: s.id, sqft: String(s.sqft), rateRupees: String(s.rateRupees) },
    ]);
  }
  function addFromProduct(productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    setItems((arr) => [
      ...arr,
      {
        ...blank(),
        description: p.name,
        productId: p.id,
        hsn: p.hsn || DEFAULT_HSN,
        uom: p.uom || DEFAULT_UOM,
        rateRupees: p.rateRupees ? String(p.rateRupees) : "",
        gstRate: String(p.gstRate ?? 18),
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
    const payload = {
      customerId,
      validUntil,
      notes,
      items: items.map((it) => ({
        description: it.description,
        slabId: it.slabId,
        productId: it.productId,
        hsn: it.hsn,
        uom: it.uom || DEFAULT_UOM,
        sqft: it.sqft,
        rateRupees: it.rateRupees || "0",
        gstRate: it.gstRate || "0",
      })),
    };
    const res = editing ? await updateQuote(quoteId!, payload) : await createQuote(payload);
    if ("error" in res) {
      setLoading(false);
      return setError(res.error ?? '');
    }
    router.replace(`/quotes/${res.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-12 pb-8">
      <h1 className="text-2xl font-bold text-white">{editing ? "Edit quote" : "New quote"}</h1>

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
              <MicDictate
                title="Speak the item"
                onText={(t) => setItem(i, { description: it.description ? `${it.description} ${t}` : t })}
              />
              <input
                suppressHydrationWarning
                value={it.hsn}
                onChange={(e) => setItem(i, { hsn: e.target.value })}
                placeholder="HSN"
                title="HSN/SAC code (6802 = granite/marble slabs, 9988 = job-work)"
                className="w-16 text-sm text-center focus:border-gold outline-none"
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
            <div className="grid grid-cols-2 gap-2">
              <NumCell label="Qty" value={it.sqft} onChange={(v) => setItem(i, { sqft: v })} />
              <label className="block">
                <span className="text-[10px] text-slate-400">Unit</span>
                <select
                  suppressHydrationWarning
                  value={it.uom}
                  onChange={(e) => setItem(i, { uom: e.target.value })}
                  className="mt-0.5 w-full !min-h-0 !py-1.5 text-sm bg-white/[0.04]"
                >
                  {UOM.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </label>
              <NumCell label="Rate ₹ / unit" value={it.rateRupees} onChange={(v) => setItem(i, { rateRupees: v })} />
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
        {products.length > 0 && (
          <select
            suppressHydrationWarning
            value=""
            onChange={(e) => {
              if (e.target.value) addFromProduct(e.target.value);
              e.target.value = "";
            }}
            className="rounded-lg border border-graphite-500 !min-h-0 !py-2 text-sm bg-white/[0.04] text-slate-300"
          >
            <option value="">+ Add product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
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
          {/* round to the nearest rupee to match the server's GST round-off */}
          <span className="font-extrabold text-gold text-lg">{formatINR(Math.round(grand) * 100)}</span>
        </div>
      </div>

      <label className="block mt-4">
        <span className="text-xs font-medium text-slate-300">Notes / terms (optional)</span>
        <div className="mt-1 flex gap-2">
          <input
            suppressHydrationWarning
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="50% advance, balance on delivery"
            className="flex-1 text-base focus:border-gold outline-none"
          />
          <MicDictate title="Speak the terms" onText={(t) => setNotes((n) => (n ? `${n} ${t}` : t))} />
        </div>
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
        {loading ? "Saving..." : editing ? "Update quote" : "Save quote"}
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
