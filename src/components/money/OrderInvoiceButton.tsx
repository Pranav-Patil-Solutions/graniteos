"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceFromOrder } from "@/actions/money";

export default function OrderInvoiceButton({
  orderId,
  invoiceId,
}: {
  orderId: string;
  invoiceId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (invoiceId) {
    return (
      <button
        onClick={() => router.push(`/invoices/${invoiceId}`)}
        className="rounded-lg border border-graphite-500 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-gold hover:text-gold"
      >
        View invoice
      </button>
    );
  }

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await createInvoiceFromOrder(orderId);
        if ('ok' in r) {
          router.push(`/invoices/${r.id}`);
          router.refresh();
        } else {
          setBusy(false);
        }
      }}
      className="rounded-lg bg-gold/15 text-gold border border-gold/40 px-2.5 py-1.5 text-xs font-bold disabled:opacity-60"
    >
      {busy ? "..." : "Create invoice"}
    </button>
  );
}
