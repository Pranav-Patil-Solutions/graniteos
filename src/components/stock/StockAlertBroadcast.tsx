"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Copy, Check, Megaphone, RotateCcw, Zap, Loader2, Settings2 } from "lucide-react";
import { setStockNotify } from "@/actions/parties";
import { broadcastNewStock, type BroadcastResult } from "@/actions/stock-alert";

export type RecentSlab = { material: string; createdAt: string };
export type AlertCustomer = { id: string; name: string; phone: string; optIn: boolean };

const DAY = 24 * 60 * 60 * 1000;

/** India-friendly: strip non-digits; prefix 91 if a bare 10-digit number. */
function waDigits(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.length === 10) d = "91" + d;
  return d;
}

export default function StockAlertBroadcast({
  companyId,
  companyName,
  recent,
  customers,
  whatsappConnected,
}: {
  companyId: string;
  companyName: string;
  recent: RecentSlab[];
  customers: AlertCustomer[];
  whatsappConnected: boolean;
}) {
  const [origin, setOrigin] = useState("");
  const [windowDays, setWindowDays] = useState(7);
  const [message, setMessage] = useState("");
  const [edited, setEdited] = useState(false);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [opt, setOpt] = useState<Record<string, boolean>>(
    () => Object.fromEntries(customers.map((c) => [c.id, c.optIn])),
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  const catalogueUrl = origin ? `${origin}/catalog/${companyId}` : "";

  // materials added within the chosen window, with counts (most recent first)
  const materials = useMemo(() => {
    const cutoff = Date.now() - windowDays * DAY;
    const counts = new Map<string, number>();
    for (const s of recent) {
      if (s.createdAt && new Date(s.createdAt).getTime() >= cutoff) {
        counts.set(s.material, (counts.get(s.material) ?? 0) + 1);
      }
    }
    return [...counts.entries()].map(([material, n]) => ({ material, n }));
  }, [recent, windowDays]);

  const defaultMessage = useMemo(() => {
    const list =
      materials.length > 0
        ? materials.map((m) => `• ${m.material} (${m.n} ${m.n === 1 ? "slab" : "slabs"})`).join("\n")
        : "• Fresh lots on the floor";
    return (
      `🆕 New stock just arrived at *${companyName}*!\n\n${list}\n\n` +
      `See the full live catalogue 👉 ${catalogueUrl}\n\n` +
      `Reply here to enquire or reserve. Thank you!`
    );
  }, [materials, companyName, catalogueUrl]);

  useEffect(() => {
    if (!edited) setMessage(defaultMessage);
  }, [defaultMessage, edited]);

  const optedIn = customers.filter((c) => opt[c.id]);
  const optedOut = customers.filter((c) => !opt[c.id]);

  async function toggle(id: string) {
    const next = !opt[id];
    setOpt((o) => ({ ...o, [id]: next })); // optimistic
    const res = await setStockNotify(id, next);
    if (res.error) setOpt((o) => ({ ...o, [id]: !next })); // revert on failure
  }

  function copyMsg() {
    navigator.clipboard?.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Single-line params for the approved WhatsApp template ({{1}},{{2}},{{3}}).
  const oneLineSummary = useMemo(() => {
    const names = materials.map((m) => m.material);
    if (names.length === 0) return "fresh lots on the floor";
    const head = names.slice(0, 3).join(", ");
    const more = names.length - 3;
    return more > 0 ? `${head} & ${more} more` : head;
  }, [materials]);

  async function autoSend() {
    if (sending) return;
    setSending(true);
    setResult(null);
    const res = await broadcastNewStock([companyName, oneLineSummary, catalogueUrl]);
    setResult(res);
    setSending(false);
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-3 pb-10">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Megaphone className="w-6 h-6 text-gold" /> Announce new stock
      </h1>
      <p className="text-sm text-slate-400">Tell customers on WhatsApp — one tap each, or one broadcast.</p>

      {/* new stock summary + window */}
      <div className="mt-5 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">New stock in the last…</span>
          <div className="flex gap-1">
            {[7, 15, 30].map((d) => (
              <button
                key={d}
                onClick={() => setWindowDays(d)}
                className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                  windowDays === d ? "bg-gold/15 text-gold border-gold/40" : "border-graphite-600 text-slate-400"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {materials.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {materials.map((m) => (
              <span key={m.material} className="rounded-lg bg-white/[0.05] border border-graphite-600 px-2.5 py-1 text-xs text-slate-200">
                {m.material} <span className="text-gold font-semibold">· {m.n}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No slabs added in this window — widen it, or edit the message below.</p>
        )}
      </div>

      {/* message */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-slate-300">Message</span>
          {edited && (
            <button onClick={() => { setEdited(false); }} className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-gold">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
        <textarea
          suppressHydrationWarning
          value={message}
          onChange={(e) => { setMessage(e.target.value); setEdited(true); }}
          rows={8}
          className="w-full text-sm leading-relaxed !min-h-0 p-3 focus:border-gold outline-none"
        />
      </div>

      {/* broadcast option */}
      <button
        onClick={copyMsg}
        className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-graphite-500 py-2.5 text-sm font-semibold text-slate-200 hover:border-gold hover:text-gold"
      >
        {copied ? <><Check className="w-4 h-4 text-granite-green2" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy message (for a WhatsApp Broadcast list)</>}
      </button>
      <p className="mt-1 text-[11px] text-slate-500 text-center">
        Tip: WhatsApp → New broadcast → pick customers → paste. One message reaches everyone.
      </p>

      {/* Path B — automated send via WhatsApp Business API */}
      <div className="mt-5 rounded-2xl border border-gold/30 bg-gradient-to-br from-[#14110a] to-graphite-800 p-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-gold" />
          <span className="text-sm font-bold text-white">Auto-send to everyone</span>
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 bg-white/[0.06] text-slate-300">
            {whatsappConnected ? "connected" : "not connected"}
          </span>
        </div>

        {whatsappConnected ? (
          <>
            <p className="mt-1.5 text-[12px] text-slate-300">
              Sends the approved template to all <b className="text-gold">{optedIn.length}</b> opted-in customers — no taps.
            </p>
            <button
              onClick={autoSend}
              disabled={sending || optedIn.length === 0}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-graphite-900 hover:brightness-110 disabled:opacity-50"
            >
              {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Zap className="w-4 h-4" /> Auto-send to {optedIn.length} customers</>}
            </button>
          </>
        ) : (
          <div className="mt-2 flex items-start gap-2 text-[12px] text-slate-400">
            <Settings2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p>
              Hands-off sending is wired and ready. Connect your <b className="text-slate-200">WhatsApp Business API</b> (Meta Cloud API or a provider) to enable it — set <code className="text-gold">WHATSAPP_TOKEN</code> + <code className="text-gold">WHATSAPP_PHONE_NUMBER_ID</code> and an approved template. Until then, use the one-tap sends below.
            </p>
          </div>
        )}

        {result && (
          <div className={`mt-3 rounded-lg px-3 py-2 text-[12px] border ${
            result.ok ? "bg-granite-green2/10 border-granite-green2/30 text-granite-green2" : "bg-red-500/10 border-red-500/20 text-red-300"
          }`}>
            {result.notConnected
              ? "WhatsApp Business API is not connected."
              : <>✅ Sent to <b>{result.sent}</b> of {result.total}{result.failed > 0 ? ` · ${result.failed} failed` : ""}.{result.errors[0] ? ` (${result.errors[0]})` : ""}</>}
          </div>
        )}
      </div>

      {/* one-by-one send list */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-300">
          Send one-by-one <span className="text-slate-500 font-normal">· {optedIn.length} opted in</span>
        </h2>
        <span className="text-[11px] text-slate-500">{sent.size}/{optedIn.length} sent</span>
      </div>

      {optedIn.length === 0 && (
        <p className="mt-3 text-center text-sm text-slate-500 py-4">
          No customers with a phone number opted in. Add customers, or opt some back in below.
        </p>
      )}

      <div className="mt-2 space-y-2">
        {optedIn.map((c) => {
          const link = `https://wa.me/${waDigits(c.phone)}?text=${encodeURIComponent(message)}`;
          const isSent = sent.has(c.id);
          return (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-graphite-600 bg-white/[0.04] p-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{c.name}</p>
                <p className="text-[11px] text-slate-400">{c.phone}</p>
              </div>
              <button
                onClick={() => toggle(c.id)}
                title="Opt out of stock alerts"
                className="text-[10px] text-slate-500 hover:text-red-300 px-1"
              >
                opt&nbsp;out
              </button>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSent((s) => new Set(s).add(c.id))}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${
                  isSent
                    ? "bg-granite-green2/15 text-granite-green2 border border-granite-green2/30"
                    : "bg-[#25D366] text-[#06351a]"
                }`}
              >
                {isSent ? <><Check className="w-4 h-4" /> Sent</> : <><MessageCircle className="w-4 h-4" /> Send</>}
              </a>
            </div>
          );
        })}
      </div>

      {/* opted-out */}
      {optedOut.length > 0 && (
        <div className="mt-6">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Opted out ({optedOut.length})</p>
          <div className="space-y-1.5">
            {optedOut.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-graphite-700 bg-white/[0.02] px-3 py-2 opacity-70">
                <span className="text-sm text-slate-400">{c.name}</span>
                <button onClick={() => toggle(c.id)} className="text-[11px] text-slate-400 hover:text-gold">opt back in</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
