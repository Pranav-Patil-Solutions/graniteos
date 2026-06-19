"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setPurchaseOrderStatus, createPurchaseBill } from "@/actions/procurement";
import { Button } from "@/components/ui/Button";

const FLOW: Record<string, { next: string; label: string } | null> = {
  draft: { next: "sent", label: "Mark as Sent" },
  sent: { next: "approved", label: "Mark Approved" },
  approved: { next: "received", label: "Mark Received" },
  received: null,
  cancelled: null,
};

export default function POActions({
  poId,
  status,
  supplierId,
  suppliers = [],
  subtotalRupees,
}: {
  poId: string;
  status: string;
  supplierId: string | null;
  suppliers?: { id: string; name: string }[];
  subtotalRupees: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [error, setError] = useState("");
  const step = FLOW[status];

  async function advance(next: string) {
    setBusy(true);
    setError("");
    const res = await setPurchaseOrderStatus(poId, next);
    setBusy(false);
    if ("error" in res) return setError(res.error ?? "");
    router.refresh();
  }

  async function onBill(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    // The PO's own supplier wins; for a quote-derived PO with no supplier, use
    // the one picked in the form so the bill can actually be recorded.
    const chosenSupplier = supplierId || String(fd.get("supplierId") || "");
    if (!chosenSupplier) {
      setBusy(false);
      return setError("Pick a supplier for this bill.");
    }
    const res = await createPurchaseBill({
      supplierId: chosenSupplier,
      poId,
      vendorBillNo: String(fd.get("vendorBillNo") || ""),
      subtotalRupees: Number(fd.get("subtotalRupees") || 0),
      gstRate: Number(fd.get("gstRate") || 18),
      dueDate: String(fd.get("dueDate") || ""),
    });
    setBusy(false);
    if ("error" in res) return setError(res.error ?? "");
    setBillOpen(false);
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {step && status !== "cancelled" && (
          <Button variant="press" disabled={busy} onClick={() => advance(step.next)}>
            {busy ? "…" : step.label}
          </Button>
        )}
        {status !== "cancelled" && status !== "received" && (
          <button
            onClick={() => advance("cancelled")}
            disabled={busy}
            className="rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Cancel PO
          </button>
        )}
        <button
          onClick={() => setBillOpen((v) => !v)}
          className="rounded-lg bg-gold/15 text-gold border border-gold/40 px-4 py-2 text-sm font-bold"
        >
          {billOpen ? "Close" : "Record vendor bill"}
        </button>
      </div>

      {billOpen && (
        <form onSubmit={onBill} className="rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-gold">Record the supplier&apos;s bill</p>
          {!supplierId && (
            <label className="block">
              <span className="text-[10px] text-slate-400">Supplier</span>
              <select
                name="supplierId"
                required
                defaultValue=""
                className="mt-0.5 w-full !min-h-0 !py-1.5 text-sm bg-white/[0.04]"
              >
                <option value="" disabled>
                  Select a supplier…
                </option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] text-slate-400">Supplier&apos;s bill no.</span>
              <input name="vendorBillNo" placeholder="e.g. INV-2291" className="mt-0.5 w-full text-sm focus:border-gold outline-none" />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-400">Due date</span>
              <input name="dueDate" type="date" className="mt-0.5 w-full text-sm focus:border-gold outline-none" />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-400">Amount ₹ (before GST)</span>
              <input
                name="subtotalRupees"
                type="number"
                inputMode="decimal"
                defaultValue={subtotalRupees}
                className="mt-0.5 w-full text-sm focus:border-gold outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-400">GST %</span>
              <select name="gstRate" defaultValue="18" className="mt-0.5 w-full !min-h-0 !py-1.5 text-sm bg-white/[0.04]">
                {[0, 5, 12, 18, 28].map((g) => (
                  <option key={g} value={g}>
                    {g}%
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Button type="submit" variant="press" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Save bill"}
          </Button>
        </form>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">{error}</div>
      )}
    </div>
  );
}
