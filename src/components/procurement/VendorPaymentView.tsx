"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOpenBillsByVendor, recordVendorBatchPayment } from "@/actions/procurement";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/money";

type Bill = {
  id: string;
  bill_no: string | null;
  vendor_bill_no: string | null;
  due_date: string | null;
  total_paise: number;
  balance_paise: number;
  daysOverdue: number;
  status: string;
  po_no: string | null;
};

const BADGE: Record<string, string> = {
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
  "due-soon": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  open: "bg-graphite-700 text-slate-400 border-graphite-600",
};
const LABEL: Record<string, string> = { overdue: "Overdue", "due-soon": "Due soon", open: "Open" };

export default function VendorPaymentView({ suppliers }: { suppliers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [bills, setBills] = useState<Bill[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [mode, setMode] = useState("upi");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function loadBills(id: string) {
    setLoading(true);
    const rows = (await getOpenBillsByVendor(id)) as Bill[];
    setBills(rows);
    setLoading(false);
  }

  async function pickSupplier(id: string) {
    setSupplierId(id);
    setSelected(new Set());
    setDone("");
    setError("");
    if (!id) {
      setBills([]);
      return;
    }
    await loadBills(id);
  }

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const selectAll = () => setSelected(new Set(bills.map((b) => b.id)));
  const selectOverdue = () => setSelected(new Set(bills.filter((b) => b.status === "overdue").map((b) => b.id)));

  const selectedBills = bills.filter((b) => selected.has(b.id));
  const selectedTotal = selectedBills.reduce((n, b) => n + b.balance_paise, 0);

  async function pay() {
    if (selectedTotal <= 0) return;
    setPaying(true);
    setError("");
    const res = await recordVendorBatchPayment({
      supplierId,
      amountRupees: selectedTotal / 100,
      mode,
      billIds: Array.from(selected),
    });
    setPaying(false);
    if ("error" in res) return setError(res.error ?? "");
    setDone(`Paid ${formatINR(selectedTotal)} across ${res.allocated} bill(s).`);
    setSelected(new Set());
    await loadBills(supplierId); // reload without wiping the confirmation
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-xs font-medium text-slate-300">Supplier</span>
        <select
          value={supplierId}
          onChange={(e) => pickSupplier(e.target.value)}
          className="mt-1 w-full text-base focus:border-gold outline-none"
        >
          <option value="">Select a supplier…</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      {done && (
        <div className="rounded-lg bg-granite-green2/10 text-granite-green2 text-sm px-3 py-2 border border-granite-green2/20">
          {done}
        </div>
      )}

      {supplierId && (
        <>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : bills.length === 0 ? (
            <p className="text-sm text-slate-500">No open bills for this supplier. Record a bill from a purchase order first.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button onClick={selectOverdue} className="text-xs rounded-lg border border-red-500/30 text-red-300 px-3 py-1.5 hover:bg-red-500/10">
                  Select all overdue
                </button>
                <button onClick={selectAll} className="text-xs rounded-lg border border-graphite-600 text-slate-300 px-3 py-1.5 hover:bg-white/[0.04]">
                  Select all
                </button>
              </div>

              <div className="rounded-2xl border border-graphite-600 bg-white/[0.04] overflow-hidden">
                {bills.map((b) => {
                  const on = selected.has(b.id);
                  return (
                    <button
                      key={b.id}
                      onClick={() => toggle(b.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-graphite-600/50 last:border-0 transition-colors ${
                        on ? "bg-gold/5 border-l-2 border-l-gold" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 shrink-0 rounded grid place-items-center border ${
                          on ? "bg-gold border-gold text-graphite-900" : "border-graphite-500"
                        }`}
                      >
                        {on ? "✓" : ""}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          {b.bill_no ?? "Bill"}
                          {b.vendor_bill_no ? <span className="text-slate-500"> · {b.vendor_bill_no}</span> : null}
                          {b.po_no ? <span className="text-slate-500"> · {b.po_no}</span> : null}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className={`text-[10px] font-semibold rounded border px-1.5 py-0.5 ${BADGE[b.status]}`}>
                            {LABEL[b.status]}
                            {b.daysOverdue > 0 ? ` ${b.daysOverdue}d` : ""}
                          </span>
                          {b.due_date && <span className="text-[10px] text-slate-500">due {b.due_date}</span>}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-white shrink-0">{formatINR(b.balance_paise)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="sticky bottom-20 lg:bottom-2 rounded-2xl border border-graphite-600 bg-graphite-900/95 backdrop-blur p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">{selected.size} bill(s) selected</p>
                    <p className="text-lg font-extrabold text-gold">{formatINR(selectedTotal)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={mode} onChange={(e) => setMode(e.target.value)} className="!min-h-0 !py-1.5 text-sm bg-white/[0.04]">
                      {["upi", "bank", "cash", "cheque", "other"].map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <Button variant="press" disabled={paying || selectedTotal <= 0} onClick={pay}>
                      {paying ? "Paying…" : "Pay Selected"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {error && <div className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">{error}</div>}
    </div>
  );
}
