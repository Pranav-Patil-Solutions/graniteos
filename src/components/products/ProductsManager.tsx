"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive, X, Package } from "lucide-react";
import { createProduct, updateProduct, archiveProduct } from "@/actions/products";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatINR } from "@/lib/money";
import { GST_RATES, UOM, DEFAULT_UOM, uomLabel } from "@/lib/validation";
import { HSN_PRESETS, DEFAULT_HSN } from "@/lib/gst";

export type ProductRow = {
  id: string;
  name: string;
  hsn_code: string | null;
  uom: string;
  default_rate_paise: number;
  gst_rate: number;
  material: string | null;
  finish: string | null;
  notes: string | null;
};

type Form = {
  name: string;
  material: string;
  finish: string;
  hsn: string;
  uom: string;
  rateRupees: string;
  gstRate: string;
  notes: string;
};

const blank: Form = {
  name: "",
  material: "",
  finish: "",
  hsn: DEFAULT_HSN,
  uom: DEFAULT_UOM,
  rateRupees: "",
  gstRate: "18",
  notes: "",
};

export default function ProductsManager({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(blank);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(patch: Partial<Form>) {
    setForm((f) => ({ ...f, ...patch }));
  }
  function startNew() {
    setEditId(null);
    setForm(blank);
    setError("");
    setOpen(true);
  }
  function startEdit(p: ProductRow) {
    setEditId(p.id);
    setForm({
      name: p.name,
      material: p.material ?? "",
      finish: p.finish ?? "",
      hsn: p.hsn_code ?? DEFAULT_HSN,
      uom: p.uom ?? DEFAULT_UOM,
      rateRupees: p.default_rate_paise ? String(p.default_rate_paise / 100) : "",
      gstRate: String(p.gst_rate ?? 18),
      notes: p.notes ?? "",
    });
    setError("");
    setOpen(true);
  }

  async function onSave() {
    setError("");
    setLoading(true);
    const payload = {
      name: form.name,
      material: form.material,
      finish: form.finish,
      hsn: form.hsn,
      uom: form.uom,
      rateRupees: form.rateRupees || "0",
      gstRate: form.gstRate || "18",
      notes: form.notes,
    };
    const res = editId ? await updateProduct(editId, payload) : await createProduct(payload);
    setLoading(false);
    if ("error" in res) return setError(res.error ?? '');
    setOpen(false);
    router.refresh();
  }

  async function onArchive(id: string) {
    await archiveProduct(id);
    router.refresh();
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-sm text-slate-400">Reusable lines for quotes &amp; invoices.</p>
        </div>
        {!open && (
          <button
            onClick={startNew}
            className="inline-flex items-center gap-1 rounded-xl bg-gold px-3 py-2 text-sm font-bold text-graphite-900 hover:brightness-110"
          >
            <Plus className="w-4 h-4" /> New
          </button>
        )}
      </div>

      {open && (
        <div className="mt-5 rounded-2xl border border-gold/30 bg-white/[0.04] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">{editId ? "Edit product" : "New product"}</h2>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <Field label="Name">
            <input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Polished Black Galaxy slab"
              className="w-full text-sm focus:border-gold outline-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Material">
              <input
                value={form.material}
                onChange={(e) => set({ material: e.target.value })}
                placeholder="Black Galaxy"
                className="w-full text-sm focus:border-gold outline-none"
              />
            </Field>
            <Field label="Finish">
              <input
                value={form.finish}
                onChange={(e) => set({ finish: e.target.value })}
                placeholder="Polished"
                className="w-full text-sm focus:border-gold outline-none"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Unit">
              <select
                value={form.uom}
                onChange={(e) => set({ uom: e.target.value })}
                className="w-full !min-h-0 !py-1.5 text-sm bg-white/[0.04]"
              >
                {UOM.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Default rate ₹ / unit">
              <input
                type="number"
                inputMode="decimal"
                value={form.rateRupees}
                onChange={(e) => set({ rateRupees: e.target.value })}
                placeholder="235"
                className="w-full text-sm focus:border-gold outline-none"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="HSN / SAC">
              {(() => {
                const isPreset = HSN_PRESETS.some((h) => h.code === form.hsn);
                return (
                  <>
                    <select
                      value={isPreset ? form.hsn : "custom"}
                      onChange={(e) => {
                        const code = e.target.value;
                        if (code === "custom") return set({ hsn: "" });
                        const preset = HSN_PRESETS.find((h) => h.code === code);
                        set({ hsn: code, gstRate: preset ? String(preset.rate) : form.gstRate });
                      }}
                      className="w-full !min-h-0 !py-1.5 text-sm bg-white/[0.04]"
                    >
                      {HSN_PRESETS.map((h) => (
                        <option key={h.code} value={h.code}>
                          {h.code} · {h.label}
                        </option>
                      ))}
                      <option value="custom">Custom…</option>
                    </select>
                    {!isPreset && (
                      <input
                        value={form.hsn}
                        onChange={(e) => set({ hsn: e.target.value })}
                        placeholder="Enter HSN / SAC"
                        maxLength={8}
                        className="mt-1.5 w-full text-sm focus:border-gold outline-none"
                      />
                    )}
                  </>
                );
              })()}
            </Field>
            <Field label="GST %">
              <select
                value={form.gstRate}
                onChange={(e) => set({ gstRate: e.target.value })}
                className="w-full !min-h-0 !py-1.5 text-sm bg-white/[0.04]"
              >
                {GST_RATES.map((g) => (
                  <option key={g} value={g}>
                    {g}%
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
              {error}
            </div>
          )}
          <Button variant="press" className="w-full" disabled={loading} onClick={onSave}>
            {loading ? "Saving..." : editId ? "Update product" : "Save product"}
          </Button>
        </div>
      )}

      <div className="mt-5 space-y-2">
        {products.length === 0 && !open && (
          <EmptyState
            heading="No products yet"
            subtext="Products are reusable line items — stone types, services, or standard cuts — that auto-fill on quotes so you quote faster."
            actionLabel="Import products from Excel"
            actionHref="/import"
            icon={<Package className="w-10 h-10" />}
          />
        )}
        {products.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-graphite-600 bg-white/[0.04] p-3 flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{p.name}</p>
              <p className="text-xs text-slate-400">
                {[p.material, p.finish].filter(Boolean).join(" · ") || "—"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {p.default_rate_paise > 0 ? `${formatINR(p.default_rate_paise)} / ${uomLabel(p.uom)}` : uomLabel(p.uom)}
                {" · "}GST {Number(p.gst_rate)}%{p.hsn_code ? ` · HSN ${p.hsn_code}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => startEdit(p)}
                className="rounded-lg border border-graphite-500 p-1.5 text-slate-300 hover:border-gold hover:text-gold"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onArchive(p.id)}
                className="rounded-lg border border-graphite-500 p-1.5 text-slate-300 hover:border-red-400 hover:text-red-300"
                title="Archive"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] text-slate-400">{label}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}
