// FIFO payment allocation — spread one payment across a customer's open
// invoices, oldest first. Pure + tested; the batch-payment action computes the
// per-invoice outstanding and hands it here. All amounts in paise.

export type Allocatable = { id: string; outstanding_paise: number };
export type Allocation = { invoiceId: string; amount_paise: number };

export function allocateFifo(
  amountPaise: number,
  invoices: Allocatable[],
): { allocations: Allocation[]; leftover_paise: number } {
  let remaining = Math.max(0, Math.floor(Number(amountPaise) || 0));
  const allocations: Allocation[] = [];
  for (const inv of invoices) {
    if (remaining <= 0) break;
    const due = Math.max(0, Math.floor(Number(inv.outstanding_paise) || 0));
    if (due <= 0) continue;
    const pay = Math.min(remaining, due);
    allocations.push({ invoiceId: inv.id, amount_paise: pay });
    remaining -= pay;
  }
  return { allocations, leftover_paise: remaining };
}
