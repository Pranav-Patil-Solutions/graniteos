"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft, Download, Upload, FileSpreadsheet, CheckCircle2,
  AlertTriangle, Users, Truck, Box, Layers, Factory, Lock, Loader2, RotateCcw,
} from "lucide-react";
import {
  IMPORT_MODULES, IN_APP_MODULES, type ImportModule, type ParsedRow,
} from "@/lib/import/registry";
import { downloadTemplate, parseFile } from "@/lib/import/xlsx-client";
import { bulkImport, type ImportResult } from "@/actions/import";

const ICONS: Record<string, React.ReactNode> = {
  customers: <Users className="w-5 h-5" />,
  suppliers: <Truck className="w-5 h-5" />,
  blocks: <Box className="w-5 h-5" />,
  slabs: <Layers className="w-5 h-5" />,
  jobs: <Factory className="w-5 h-5" />,
};

const card = "rounded-2xl border border-graphite-600 bg-white/[0.04] backdrop-blur";

export default function ImportWizard() {
  const [mod, setMod] = useState<ImportModule | null>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset(keepModule = true) {
    setRows(null); setHeaderError(null); setFileName(null);
    setResult(null); setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!keepModule) setMod(null);
  }

  function pick(m: ImportModule) { reset(false); setMod(m); }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !mod) return;
    setResult(null); setHeaderError(null); setRows(null);
    setFileName(file.name);
    setBusy(true);
    try {
      const { rows, headerError } = await parseFile(file, mod);
      if (headerError) setHeaderError(headerError);
      else setRows(rows);
    } catch {
      setHeaderError("Couldn't read that file. Use an .xlsx or .csv saved from the template.");
    } finally {
      setBusy(false);
    }
  }

  const valid = rows?.filter((r) => r.ok) ?? [];
  const errors = rows?.filter((r) => !r.ok && r.error !== "Empty row — skipped") ?? [];

  async function runImport() {
    if (!mod || valid.length === 0) return;
    setBusy(true);
    try {
      const res = await bulkImport(
        mod.key,
        valid.map((r) => ({ rowNo: r.rowNo, data: r.data })),
      );
      setResult(res);
    } catch {
      setResult({ ok: false, module: mod.key, total: valid.length, inserted: 0, failed: [], error: "Import failed. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ChevronLeft className="w-4 h-4" /> Settings
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-white">Import from Excel</h1>
      <p className="text-sm text-slate-400 mb-5">
        Bring your existing data in. Download a template, fill it, upload it — we check every row before saving.
      </p>

      {/* module picker */}
      {!mod && (
        <>
          <div className="grid grid-cols-1 gap-2.5">
            {IMPORT_MODULES.map((m) => (
              <button key={m.key} onClick={() => pick(m)}
                className={`${card} p-4 text-left flex items-start gap-3 hover:border-gold/60 transition-colors`}>
                <span className="mt-0.5 text-gold">{ICONS[m.key]}</span>
                <span className="flex-1">
                  <span className="block text-white font-semibold">{m.label}</span>
                  <span className="block text-xs text-slate-400 mt-0.5">{m.blurb}</span>
                  {m.dependsOn && (
                    <span className="inline-block mt-1.5 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">
                      Import {m.dependsOn} first
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Created inside the app — not imported</p>
            <div className={`${card} p-4 space-y-2.5`}>
              {IN_APP_MODULES.map((m) => (
                <div key={m.label} className="flex items-start gap-3">
                  <Lock className="w-4 h-4 text-slate-500 mt-0.5" />
                  <div>
                    <div className="text-sm text-slate-300 font-medium">{m.label}</div>
                    <div className="text-xs text-slate-500">{m.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* selected module flow */}
      {mod && (
        <div>
          <button onClick={() => reset(false)} className="text-xs text-slate-400 hover:text-slate-200 mb-3">
            ← All import types
          </button>

          <div className={`${card} p-4`}>
            <div className="flex items-center gap-2.5">
              <span className="text-gold">{ICONS[mod.key]}</span>
              <h2 className="text-lg font-semibold text-white">{mod.label}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">{mod.blurb}</p>

            {/* step 1 — template */}
            <div className="mt-4 pt-4 border-t border-graphite-600">
              <p className="text-xs font-semibold text-slate-300 mb-2">Step 1 · Get the template</p>
              <button onClick={() => downloadTemplate(mod)}
                className="inline-flex items-center gap-2 rounded-xl border border-gold/50 text-gold-soft px-4 py-2.5 text-sm font-medium hover:bg-gold/10">
                <Download className="w-4 h-4" /> Download Excel template
              </button>
              <p className="text-[11px] text-slate-500 mt-2">
                Has an example row + an Instructions sheet listing every column and its allowed values.
              </p>
            </div>

            {/* step 2 — upload */}
            <div className="mt-4 pt-4 border-t border-graphite-600">
              <p className="text-xs font-semibold text-slate-300 mb-2">Step 2 · Upload your filled file</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-granite-green2 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-60">
                {busy && !rows ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {fileName ? "Choose a different file" : "Choose file (.xlsx / .csv)"}
              </button>
              {fileName && (
                <p className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 mt-2">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> {fileName}
                </p>
              )}
            </div>
          </div>

          {/* header error */}
          {headerError && (
            <div className="mt-3 rounded-xl bg-red-500/10 text-red-300 text-sm px-3 py-2.5 border border-red-500/20 flex gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {headerError}
            </div>
          )}

          {/* preview */}
          {rows && !result && (
            <div className={`${card} p-4 mt-3`}>
              <div className="flex gap-2">
                <span className="flex-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-center">
                  <span className="block text-xl font-bold text-emerald-300">{valid.length}</span>
                  <span className="block text-[11px] text-emerald-200/70">ready to import</span>
                </span>
                <span className="flex-1 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-center">
                  <span className="block text-xl font-bold text-amber-300">{errors.length}</span>
                  <span className="block text-[11px] text-amber-200/70">need fixing</span>
                </span>
              </div>

              {errors.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-300 mb-1.5">Rows to fix (won't be imported):</p>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {errors.slice(0, 100).map((r) => (
                      <div key={r.rowNo} className="text-xs flex gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                        <span className="text-amber-300 font-mono shrink-0">Row {r.rowNo}</span>
                        <span className="text-slate-400">{r.error}</span>
                      </div>
                    ))}
                    {errors.length > 100 && (
                      <p className="text-[11px] text-slate-500">…and {errors.length - 100} more</p>
                    )}
                  </div>
                </div>
              )}

              <button onClick={runImport} disabled={busy || valid.length === 0}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-granite-green2 text-white px-4 py-3 text-sm font-semibold disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {valid.length > 0 ? `Import ${valid.length} ${mod.label.toLowerCase()}` : "Nothing to import yet"}
              </button>
            </div>
          )}

          {/* result */}
          {result && (
            <div className={`${card} p-4 mt-3`}>
              {result.error && result.inserted === 0 ? (
                <div className="flex gap-2 text-red-300">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Import didn't go through</p>
                    <p className="text-sm text-slate-400 mt-0.5">{result.error}</p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-semibold">
                      Imported {result.inserted} {mod.label.toLowerCase()}
                    </p>
                    {result.failed.length > 0 && (
                      <p className="text-sm text-amber-300/90 mt-0.5">
                        {result.failed.length} row(s) skipped — see below.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {result.failed.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {result.failed.slice(0, 100).map((f) => (
                    <div key={f.rowNo} className="text-xs flex gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                      <span className="text-amber-300 font-mono shrink-0">Row {f.rowNo}</span>
                      <span className="text-slate-400">{f.reason}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={() => reset(true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-graphite-600 text-slate-200 px-4 py-2.5 text-sm hover:bg-white/[0.04]">
                  <RotateCcw className="w-4 h-4" /> Import another file
                </button>
                {result.inserted > 0 && (
                  <Link href={pathFor(mod.key)}
                    className="flex-1 inline-flex items-center justify-center rounded-xl bg-granite-green2 text-white px-4 py-2.5 text-sm font-medium">
                    View imported
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function pathFor(key: string): string {
  if (key === "customers" || key === "suppliers") return "/parties";
  if (key === "blocks" || key === "slabs") return "/inventory";
  if (key === "jobs") return "/fabrication";
  return "/dashboard";
}
