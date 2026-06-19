"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2 } from "lucide-react";
import { setQuoteStatus, confirmOrder } from "@/actions/quotes";
import { Button } from "@/components/ui/Button";

export default function QuoteActions({
  quoteId,
  status,
  hasOrder,
  viewOnly = false,
}: {
  quoteId: string;
  status: string;
  hasOrder: boolean;
  viewOnly?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setBusy(true);
    setError("");
    const r = await setQuoteStatus(quoteId, "sent");
    setBusy(false);
    if ("error" in r) return setError(r.error ?? '');
    router.refresh();
  }

  async function reject() {
    setBusy(true);
    setError("");
    const r = await setQuoteStatus(quoteId, "rejected");
    setBusy(false);
    if ("error" in r) return setError(r.error ?? "");
    router.refresh();
  }

  async function confirm() {
    setBusy(true);
    setError("");
    const r = await confirmOrder(quoteId);
    if ("error" in r) {
      setBusy(false);
      return setError(r.error ?? '');
    }
    router.push("/orders");
    router.refresh();
  }

  // View-only users get navigation only (if there's already an order), no mutations.
  if (viewOnly) {
    return hasOrder ? (
      <div className="mt-5">
        <Button variant="spring" className="w-full" onClick={() => router.push("/orders")}>
          <CheckCircle2 className="w-4 h-4" /> View order
        </Button>
      </div>
    ) : null;
  }

  const isOpen = status === "draft" || status === "sent";

  return (
    <div className="mt-5 space-y-2">
      {error && (
        <div className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        {status === "draft" && (
          <Button variant="outline" className="flex-1" onClick={send} disabled={busy}>
            <Send className="w-4 h-4" /> Mark as sent
          </Button>
        )}
        {hasOrder ? (
          <Button variant="spring" className="flex-1" onClick={() => router.push("/orders")}>
            <CheckCircle2 className="w-4 h-4" /> View order
          </Button>
        ) : (
          isOpen && (
            <Button variant="press" className="flex-1" onClick={confirm} disabled={busy}>
              {busy ? "Confirming..." : "Confirm → Order"}
            </Button>
          )
        )}
      </div>
      {!hasOrder && isOpen && (
        <button
          onClick={reject}
          disabled={busy}
          className="w-full rounded-lg border border-red-500/20 bg-red-500/5 text-red-300 px-3 py-2 text-xs font-semibold hover:bg-red-500/10 disabled:opacity-50"
        >
          Mark as rejected
        </button>
      )}
      {!hasOrder && (status === "rejected" || status === "expired") && (
        <p className="text-xs text-slate-500 capitalize">
          This quote is {status}. Edit it to revise and re-send.
        </p>
      )}
    </div>
  );
}
