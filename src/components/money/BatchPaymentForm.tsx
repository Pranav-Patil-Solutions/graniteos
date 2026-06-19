"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { recordBatchPayment } from "@/actions/batch-payment";
import { formatINR, rupeesToPaise } from "@/lib/money";
import { allocateFifo } from "@/lib/allocate";
import ConfettiBurst from "@/components/voice/ConfettiBurst";

type Invoice = { id: string; no: string | null; outstanding_paise: number };
type Customer = { id: string; name: string; outstanding_paise: number; invoices: Invoice[] };
const MODES = ["cash", "upi", "bank", "cheque", "other"] as const;

export default function BatchPaymentForm({ customers }: { customers: Customer[] }) {
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<string>("upi");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [pending, startTransition] = useTransition();

  const selected = customers.find((c) => c.id === customerId);
  const amountPaise = rupeesToPaise(Number(amount) || 0);

  // Live FIFO preview — same allocator the server uses, oldest invoice first.
  const preview = useMemo(() => {
    if (!selected || amountPaise <= 0) return null;
    const { allocations, leftover_paise } = allocateFifo(amountPaise, selected.invoices);
    const byId = new Map(selected.invoices.map((i) => [i.id, i]));
    return {
      rows: allocations.map((a) => {
        const inv = byId.get(a.invoiceId);
        const settles = inv ? a.amount_paise >= inv.outstanding_paise : false;
        return { no: inv?.no ?? "Invoice", amount: a.amount_paise, settles };
      }),
      leftover: leftover_paise,
    };
  }, [selected, amountPaise]);

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
        setCelebrate((c) => c + 1);
      } else {
        setMsg({ ok: false, text: "error" in res && res.error ? res.error : "Something went wrong." });
      }
    });
  }

  if (customers.length === 0) {
    return (
      <div className="rounded-2xl border border-graphite-600 bg-white/[0.04] p-6 text-center">
        <p className="text-sm text-slate-400">
          No customers with open invoices right now. Raise an invoice from a confirmed order, then come back to settle it in one payment.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-graphite-600 bg-white/[0.04] backdrop-blur p-4 space-y-4">
      <ConfettiBurst fire={celebrate} label="Payment recorded 🎉" />

      <label className="block">
        <span className="text-xs text-slate-400">Customer</span>
        <select
          value={customerId}
          onChange={(e) => {
            setCustomerId(e.target.value);
            setMsg(null);
          }}
          className="mt-1 w-full !min-h-0 !py-2 text-sm bg-white/[0.04]"
        >
          <option value="">— select a customer with dues —</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {formatINR(c.outstanding_paise)} due
            </option>
          ))}
        </select>
      </label>

      {selected && (
        <div className="flex items-center justify-between rounded-xl border border-graphite-600 bg-white/[0.02] px-3 py-2.5">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Outstanding</p>
            <p className="text-lg font-extrabold text-red-300 leading-none mt-0.5">{formatINR(selected.outstanding_paise)}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              across {selected.invoices.length} open invoice{selected.invoices.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAmount(String(Math.round(selected.outstanding_paise / 100)))}
            className="rounded-lg border border-gold/40 bg-gold/15 text-gold px-3 py-1.5 text-xs font-bold hover:bg-gold/20 transition"
          >
            Pay full
          </button>
        </div>
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
            className="mt-1 w-full text-sm focus:border-gold outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-400">Mode</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="mt-1 w-full !min-h-0 !py-2 text-sm bg-white/[0.04]"
          >
            {MODES.map((m) => (
              <option key={m} value={m}>{m.toUpperCase()}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Live allocation preview — exactly how this payment will land */}
      {preview && preview.rows.length > 0 && (
        <div className="rounded-xl border border-graphite-600 bg-white/[0.02] p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gold mb-2">This payment fills, oldest first</p>
          <div className="space-y-1.5">
            {preview.rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-slate-300 flex-1 truncate">{r.no}</span>
                {r.settles && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-granite-green2">
                    <CheckCircle2 className="w-3 h-3" /> settled
                  </span>
                )}
                <span className="font-semibold text-white tabular-nums">{formatINR(r.amount)}</span>
              </div>
            ))}
          </div>
          {preview.leftover > 0 && (
            <p className="mt-2 pt-2 border-t border-graphite-600/60 text-xs text-amber-300/90">
              {formatINR(preview.leftover)} more than the open invoices — will stay unallocated.
            </p>
          )}
        </div>
      )}

      <button
        onClick={submit}
        disabled={pending}
        className="w-full rounded-xl bg-gold text-graphite-900 hover:brightness-110 disabled:opacity-50 text-sm font-bold py-2.5 transition"
      >
        {pending ? "Recording…" : "Record batch payment"}
      </button>

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-granite-green2" : "text-rose-400"}`}>{msg.text}</p>
      )}
    </div>
  );
}
