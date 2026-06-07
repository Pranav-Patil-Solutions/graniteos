"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordPayment } from "@/actions/money";
import { Button } from "@/components/ui/Button";
import { PAYMENT_MODES } from "@/lib/validation";
import { paiseToRupees } from "@/lib/money";

export default function RecordPaymentForm({
  invoiceId,
  outstandingPaise,
}: {
  invoiceId: string;
  outstandingPaise: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await recordPayment({
      invoiceId,
      amountRupees: fd.get("amountRupees"),
      mode: fd.get("mode"),
      paidOn: fd.get("paidOn") ?? "",
      reference: fd.get("reference") ?? "",
    });
    setLoading(false);
    if (res.error) return setError(res.error);
    (e.target as HTMLFormElement).reset();
    setOpen(false);
    router.refresh();
  }

  if (outstandingPaise <= 0) return null;

  if (!open) {
    return (
      <Button variant="press" className="w-full mt-5" onClick={() => setOpen(true)}>
        Record payment
      </Button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-5 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 space-y-3"
    >
      <p className="font-bold text-white">Record payment</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-slate-300">Amount ₹</span>
          <input
            suppressHydrationWarning
            name="amountRupees"
            type="number"
            inputMode="decimal"
            defaultValue={Math.round(paiseToRupees(outstandingPaise))}
            className="mt-1 w-full text-base focus:border-gold outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-300">Mode</span>
          <select
            suppressHydrationWarning
            name="mode"
            defaultValue="upi"
            className="mt-1 w-full text-base focus:border-gold outline-none capitalize"
          >
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-slate-300">Date</span>
          <input
            suppressHydrationWarning
            name="paidOn"
            type="date"
            className="mt-1 w-full text-base focus:border-gold outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-300">Reference (opt.)</span>
          <input
            suppressHydrationWarning
            name="reference"
            placeholder="UPI ref / cheque no"
            className="mt-1 w-full text-base focus:border-gold outline-none"
          />
        </label>
      </div>
      {error && (
        <div className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="press" className="flex-1" disabled={loading}>
          {loading ? "Saving..." : "Save payment"}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 text-sm text-slate-400 hover:text-slate-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
