"use client";

import { useState } from "react";
import { Printer, Plus, Trash2 } from "lucide-react";

export type Customer = { id: string; name: string; phone: string | null; city: string | null };
type Row = { id: string; label: string; length: string; width: string; qty: string };

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

/** Area in sq.ft for one row: (L × W ÷ 144) × qty, rounded to 2 dp. */
function areaOf(r: Row): number {
  const len = Number(r.length) || 0;
  const wid = Number(r.width) || 0;
  const qty = Number(r.qty) || 0;
  return Math.round(((len * wid) / 144) * (qty || 1) * 100) / 100;
}

const blankRow = (): Row => ({ id: uid(), label: "", length: "", width: "", qty: "1" });

/**
 * On-site measurement entry — an operator types each piece (item, L×W, qty),
 * picks the customer, and prints/saves a clean PDF. Local-only (no DB write):
 * it's a field sheet, printed and handed/sent to the party.
 */
export default function SiteMeasureSheet({
  customers,
  companyName,
  generatedAt,
}: {
  customers: Customer[];
  companyName: string;
  generatedAt: string;
}) {
  const [customer, setCustomer] = useState("");
  const [site, setSite] = useState("");
  const [rows, setRows] = useState<Row[]>([blankRow(), blankRow()]);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addRow = () => setRows((r) => [...r, blankRow()]);
  const removeRow = (id: string) => setRows((r) => (r.length > 1 ? r.filter((x) => x.id !== id) : r));

  const filled = rows.filter((r) => Number(r.length) > 0 && Number(r.width) > 0);
  const totalSqft = Math.round(filled.reduce((n, r) => n + areaOf(r), 0) * 100) / 100;
  const totalPieces = filled.reduce((n, r) => n + (Number(r.qty) || 1), 0);
  const canPrint = customer.trim().length > 0 && filled.length > 0;

  // Match a typed name back to a saved customer (for the printed phone/city).
  const matched = customers.find((c) => c.name.toLowerCase() === customer.trim().toLowerCase());

  return (
    <div>
      {/* ── Entry form (screen only) ───────────────────────────────────── */}
      <div className="no-print space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-slate-400">Customer</span>
            <input
              list="measure-customers"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Type or pick a customer…"
              className="mt-1 w-full text-sm focus:border-gold outline-none"
            />
            <datalist id="measure-customers">
              {customers.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Site / location (optional)</span>
            <input
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="e.g. Kitchen, 2nd floor"
              className="mt-1 w-full text-sm focus:border-gold outline-none"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-graphite-600 bg-white/[0.04] overflow-hidden">
          <div className="grid grid-cols-[1fr_4.5rem_4.5rem_3.5rem_5rem_2rem] gap-2 px-3 py-2 text-[10px] uppercase tracking-wide text-slate-400 border-b border-graphite-600/60">
            <span>Item</span>
            <span className="text-right">L (in)</span>
            <span className="text-right">W (in)</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Area</span>
            <span />
          </div>
          {rows.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[1fr_4.5rem_4.5rem_3.5rem_5rem_2rem] gap-2 px-3 py-1.5 items-center border-b border-graphite-600/40 last:border-0"
            >
              <input
                value={r.label}
                onChange={(e) => update(r.id, { label: e.target.value })}
                placeholder="Platform / slab…"
                className="!min-h-0 !py-1.5 text-sm focus:border-gold outline-none"
              />
              <input
                type="number"
                inputMode="decimal"
                value={r.length}
                onChange={(e) => update(r.id, { length: e.target.value })}
                className="!min-h-0 !py-1.5 text-sm text-right focus:border-gold outline-none"
              />
              <input
                type="number"
                inputMode="decimal"
                value={r.width}
                onChange={(e) => update(r.id, { width: e.target.value })}
                className="!min-h-0 !py-1.5 text-sm text-right focus:border-gold outline-none"
              />
              <input
                type="number"
                inputMode="numeric"
                value={r.qty}
                onChange={(e) => update(r.id, { qty: e.target.value })}
                className="!min-h-0 !py-1.5 text-sm text-right focus:border-gold outline-none"
              />
              <span className="text-sm text-right tabular-nums text-slate-300">
                {areaOf(r) > 0 ? areaOf(r).toFixed(2) : "—"}
              </span>
              <button
                onClick={() => removeRow(r.id)}
                aria-label="Remove row"
                className="text-slate-500 hover:text-rose-300 justify-self-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-lg border border-graphite-600 px-3 py-2 text-sm text-slate-200 hover:border-gold hover:text-gold transition-colors"
          >
            <Plus className="w-4 h-4" /> Add item
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">
              Total: <span className="font-bold text-white">{totalSqft.toLocaleString("en-IN")} sq.ft</span>
            </span>
            <button
              onClick={() => window.print()}
              disabled={!canPrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold text-graphite-900 px-3.5 py-2 text-sm font-bold disabled:opacity-40"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
          </div>
        </div>
        {!canPrint && (
          <p className="text-xs text-slate-500">Add a customer and at least one measured item to print.</p>
        )}
      </div>

      {/* ── Printable sheet (live preview; this is what prints) ─────────── */}
      <div className="measure-print mt-5 rounded-2xl border border-graphite-600 bg-white/[0.04] p-5">
        <div className="flex items-start justify-between gap-4 border-b border-graphite-600/60 pb-3">
          <div>
            <p className="text-lg font-bold text-white">{companyName || "Measurement Sheet"}</p>
            <p className="text-sm text-slate-400">Measurement Sheet</p>
          </div>
          <p className="text-xs text-slate-400">{generatedAt}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <p>
            <span className="text-slate-500">Customer: </span>
            <span className="text-slate-200 font-medium">{customer.trim() || "—"}</span>
            {matched?.phone ? <span className="text-slate-500"> · {matched.phone}</span> : null}
          </p>
          {(site.trim() || matched?.city) && (
            <p className="text-right">
              <span className="text-slate-500">Site: </span>
              <span className="text-slate-200">{site.trim() || matched?.city}</span>
            </p>
          )}
        </div>

        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-graphite-600/60">
              <th className="py-2 pr-2 font-medium w-8">#</th>
              <th className="py-2 pr-2 font-medium">Item</th>
              <th className="py-2 px-2 font-medium text-right">L (in)</th>
              <th className="py-2 px-2 font-medium text-right">W (in)</th>
              <th className="py-2 px-2 font-medium text-right">Qty</th>
              <th className="py-2 pl-2 font-medium text-right">Area (sq.ft)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-graphite-600/40">
            {filled.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-500">
                  Measured items will appear here.
                </td>
              </tr>
            ) : (
              filled.map((r, i) => (
                <tr key={r.id} className="text-slate-200">
                  <td className="py-2 pr-2 text-slate-500">{i + 1}</td>
                  <td className="py-2 pr-2">{r.label.trim() || "Item"}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{r.length}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{r.width}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{Number(r.qty) || 1}</td>
                  <td className="py-2 pl-2 text-right tabular-nums">{areaOf(r).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
          {filled.length > 0 && (
            <tfoot>
              <tr className="border-t border-graphite-600/60 font-semibold text-white">
                <td colSpan={4} className="py-3">
                  Total · {totalPieces} piece{totalPieces === 1 ? "" : "s"}
                </td>
                <td />
                <td className="py-3 text-right tabular-nums">{totalSqft.toLocaleString("en-IN")} sq.ft</td>
              </tr>
            </tfoot>
          )}
        </table>

        <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-slate-400">
          <div className="border-t border-graphite-600/60 pt-1.5">Measured by</div>
          <div className="border-t border-graphite-600/60 pt-1.5 text-right">Customer signature</div>
        </div>
      </div>
    </div>
  );
}
