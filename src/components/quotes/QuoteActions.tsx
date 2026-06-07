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
}: {
  quoteId: string;
  status: string;
  hasOrder: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setBusy(true);
    setError("");
    const r = await setQuoteStatus(quoteId, "sent");
    setBusy(false);
    if (r.error) return setError(r.error);
    router.refresh();
  }

  async function confirm() {
    setBusy(true);
    setError("");
    const r = await confirmOrder(quoteId);
    if (r.error) {
      setBusy(false);
      return setError(r.error);
    }
    router.push("/orders");
    router.refresh();
  }

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
          <Button variant="press" className="flex-1" onClick={confirm} disabled={busy}>
            {busy ? "Confirming..." : "Confirm → Order"}
          </Button>
        )}
      </div>
    </div>
  );
}
