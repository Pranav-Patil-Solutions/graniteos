"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { updateInvoice } from "@/actions/money";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/money";
import { GST_RATES, UOM, DEFAULT_UOM } from "@/lib/validation";
import { DEFAULT_HSN } from "@/lib/gst";
import type { Product } from "@/components/quotes/QuoteBuilder";

type Item = {
  description: string;
  productId: string;
  hsn: string;
  uom: string;
  sqft: string;
  rateRupees: string;
  gstRate: string;
};

const blank = (): Item => ({
  description: "",
  productId: "",
  hsn: DEFAULT_HSN,
  uom: DEFAULT_UOM,
  sqft: "",
  rateRupees: "",
  gstRate: "18",
});

export default function InvoiceEditor({
  invoiceId,
  invoiceNo,
  initialItems,
  products = [],
}: {
  invoiceId: string;
  invoiceNo: string;
  initialItems: Item[];
  products?: Product[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initialItems.length ? initialItems : [blank()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setItem(i: number, patch: Partial<Item>) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
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
    const res = await updateInvoice(invoiceId, {
      items: items.map((it) => ({
        description: it.description,
        productId: it.productId,
        hsn: it.hsn,
        uom: it.uom || DEFAULT_UOM,
        sqft: it.sqft,
        rateRupees: it.rateRupees || "0",
        gstRate: it.gstRate || "0",
      })),
    });
    if (res.error) {
      setLoading(false);
      return setError(res.error);
    }
    router.replace(`/invoices/${invoiceId}`);
    router.refresh();
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <h1 className="text-2xl font-bold text-white">Edit invoice</h1>
      <p className="text-sm text-slate-400">{invoiceNo}</p>

      <div className="mt-5 space-y-3">
        {items.map((it, i) => (
          <div key={i} className="rounded-2xl border border-graphite-600 bg-white/[0.04] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={it.description}
                onChange={(e) => setItem(i, { description: e.target.value })}
                placeholder="Polished Black Galaxy slab"
                className="flex-1 text-sm focus:border-gold outline-none"
              />
              <input
                value={it.hsn}
                onChange={(e) => setItem(i, { hsn: e.target.value })}
                placeholder="HSN"
                title="HSN/SAC code"
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
      </div>

      <div className="mt-5 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 space-y-1.5">
        <Row label="Taxable value" value={formatINR(Math.round(subtotal * 100))} />
        <Row label="GST" value={formatINR(Math.round(gstTotal * 100))} />
        <div className="flex justify-between pt-1.5 border-t border-graphite-600">
          <span className="font-bold text-white">Total</span>
          {/* round to the nearest rupee to match the server's GST round-off */}
          <span className="font-extrabold text-gold text-lg">{formatINR(Math.round(grand) * 100)}</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
          {error}
        </div>
      )}
      <Button variant="press" className="w-full mt-4" disabled={loading} onClick={onSave}>
        {loading ? "Saving..." : "Update invoice"}
      </Button>
    </div>
  );
}

function NumCell({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] text-slate-400">{label}</span>
      <input
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
