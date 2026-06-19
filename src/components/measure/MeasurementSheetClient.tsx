"use client";

import { useMemo, useState } from "react";
import { Printer, Download } from "lucide-react";
import { formatINR } from "@/lib/money";
import { sheetTotals } from "@/lib/measure-sheet";

export type MeasureRow = {
  id: string;
  material: string;
  label: string;
  length_in: number;
  width_in: number;
  sqft: number;
  rate_paise: number;
  value_paise: number;
  status: string;
  godown: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  in_stock: "bg-emerald-500/15 text-emerald-300",
  reserved: "bg-amber-500/15 text-amber-300",
  sold: "bg-slate-500/15 text-slate-300",
};

const PRINT_CSS = `@media print {
  @page { margin: 14mm; }
  body { background: #fff !important; }
  body * { visibility: hidden !important; }
  .measure-print, .measure-print * { visibility: visible !important; color: #000 !important; }
  .measure-print { position: absolute; left: 0; top: 0; width: 100%; border: 0 !important; background: #fff !important; }
  .measure-print th, .measure-print td { border-color: #ccc !important; }
  .no-print { display: none !important; }
}`;

export default function MeasurementSheetClient({
  rows,
  companyName,
  generatedAt,
}: {
  rows: MeasureRow[];
  companyName: string;
  generatedAt: string;
}) {
  const [material, setMaterial] = useState("all");
  const [status, setStatus] = useState("all");

  const materials = useMemo(
    () => Array.from(new Set(rows.map((r) => r.material).filter((m) => m && m !== "—"))).sort(),
    [rows],
  );
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) => (material === "all" || r.material === material) && (status === "all" || r.status === status),
      ),
    [rows, material, status],
  );
  const totals = sheetTotals(filtered.map((r) => ({ sqft: r.sqft, rate_paise: r.rate_paise })));

  function exportCSV() {
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["Material", "Label", "Length (in)", "Width (in)", "Area (sq.ft)", "Rate (Rs)", "Value (Rs)", "Status", "Godown"];
    const body = filtered.map((r) => [
      r.material,
      r.label,
      r.length_in,
      r.width_in,
      r.sqft,
      (r.rate_paise / 100).toFixed(2),
      (r.value_paise / 100).toFixed(2),
      r.status,
      r.godown ?? "",
    ]);
    const footer = ["Total", "", "", "", totals.area, "", (totals.value_paise / 100).toFixed(2), "", ""];
    const csv = [header, ...body, [], footer].map((row) => row.map(esc).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `measurement-sheet-${material === "all" ? "all" : material}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const scope = `${material === "all" ? "All materials" : material} · ${status === "all" ? "all status" : status.replace(/_/g, " ")}`;

  return (
    <div className="px-4 pt-12 pb-8 max-w-4xl lg:max-w-6xl mx-auto">
      <style>{PRINT_CSS}</style>

      {/* toolbar — screen only */}
      <div className="no-print flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Measurement Sheet</h1>
          <p className="text-sm text-slate-400">Every slab — size, area and value, from your stock.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="!min-h-0 !py-1.5 text-sm bg-white/[0.04]"
            aria-label="Filter by material"
          >
            <option value="all">All materials</option>
            {materials.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="!min-h-0 !py-1.5 text-sm bg-white/[0.04]"
            aria-label="Filter by status"
          >
            <option value="all">All status</option>
            <option value="in_stock">In stock</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
          </select>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-graphite-600 px-3 py-1.5 text-sm text-slate-200 hover:border-gold hover:text-gold disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={() => window.print()}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gold text-graphite-900 px-3 py-1.5 text-sm font-bold disabled:opacity-40"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* printable sheet */}
      <div className="measure-print rounded-2xl border border-graphite-600 bg-white/[0.04] overflow-x-auto">
        {/* print-only header */}
        <div className="hidden print:block px-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold">{companyName || "Measurement Sheet"}</p>
              <p className="text-sm">Measurement Sheet · {scope}</p>
            </div>
            <p className="text-xs">{generatedAt}</p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">No slabs match this filter.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-graphite-600/60">
                <th scope="col" className="px-4 py-2.5 font-medium">Material</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Size (in)</th>
                <th scope="col" className="px-3 py-2.5 font-medium text-right">Area</th>
                <th scope="col" className="px-3 py-2.5 font-medium text-right">Rate</th>
                <th scope="col" className="px-3 py-2.5 font-medium text-right">Value</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite-600/40">
              {filtered.map((s) => (
                <tr key={s.id} className="text-slate-200">
                  <td className="px-4 py-2.5">
                    {s.material}
                    {s.label ? <span className="text-slate-500"> · {s.label}</span> : null}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-300">
                    {s.length_in} × {s.width_in}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-right">{s.sqft.toLocaleString("en-IN")} sq.ft</td>
                  <td className="px-3 py-2.5 tabular-nums text-right text-slate-400">{formatINR(s.rate_paise)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-right">{formatINR(s.value_paise)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[s.status] ?? "bg-slate-500/15 text-slate-300"}`}>
                      {s.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-graphite-600/60 font-semibold text-white">
                <td className="px-4 py-3" colSpan={2}>
                  Total · {totals.count} pcs
                </td>
                <td className="px-3 py-3 tabular-nums text-right">{totals.area.toLocaleString("en-IN")} sq.ft</td>
                <td />
                <td className="px-3 py-3 tabular-nums text-right">{formatINR(totals.value_paise)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
