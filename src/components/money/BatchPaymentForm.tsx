"use client";

import { useState, useTransition } from "react";
import { recordBatchPayment } from "@/actions/batch-payment";
import { formatINR } from "@/lib/money";

type Customer = { id: string; name: string; outstanding_paise: number };
const MODES = ["cash", "upi", "bank", "cheque", "other"] as const;

export default function BatchPaymentForm({ customers }: { customers: Customer[] }) {
  const withDues = customers.filter((c) => c.outstanding_paise > 0);
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<string>("upi");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = withDues.find((c) => c.id === customerId);

  function submit() {
    setMsg(null);
    const amt = Number(amount);
    if (!customerId) return setMsg({ ok: false, text: "Select a customer." });
    if (!(amt > 0)) return setMsg({ ok: false, text: "Enter an amount." });
    startTransition(async () => {
      const res = await recordBatchPayment({ customerId, amountRupees: amt, mode });
      if ("ok" in res && res.ok) {
        const left = res.leftover_paise > 0 ? ` · ${formatINR(res.leftover_paise)} left unallocated` : "";
        setMsg({ ok: true, text: `Recorded across ${res.allocated} invoice${res.allocated === 1 ? "" : "s"}${left}.` });
        setAmount("");
      } else {
        setMsg({ ok: false, text: "error" in res && res.error ? res.error : "Something went wrong." });
      }
    });
  }

  return (
    <div className="rounded-2xl border border-graphite-600 bg-white/[0.04] backdrop-blur p-4 space-y-4">
      <label className="block">
        <span className="text-xs text-slate-400">Customer</span>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="mt-1 w-full rounded-lg bg-white/[0.04] border border-graphite-600 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">— select customer with dues —</option>
          {withDues.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {formatINR(c.outstanding_paise)} due
            </option>
          ))}
        </select>
      </label>

      {selected && (
        <p className="text-xs text-slate-400">
          Outstanding: <span className="text-slate-200 font-medium">{formatINR(selected.outstanding_paise)}</span> — payment
          fills oldest invoices first.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-slate-400">Amount (₹)</span>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="50000"
            className="mt-1 w-full rounded-lg bg-white/[0.04] border border-graphite-600 px-3 py-2 text-sm text-slate-100"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-400">Mode</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="mt-1 w-full rounded-lg bg-white/[0.04] border border-graphite-600 px-3 py-2 text-sm text-slate-100"
          >
            {MODES.map((m) => (
              <option key={m} value={m}>{m.toUpperCase()}</option>
            ))}
          </select>
        </label>
      </div>

      <button
        onClick={submit}
        disabled={pending}
        className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium py-2.5"
      >
        {pending ? "Recording…" : "Record batch payment"}
      </button>

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-rose-400"}`}>{msg.text}</p>
      )}
    </div>
  );
}
