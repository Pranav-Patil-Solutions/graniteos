/**
 * Pure logic for the Getting Started checklist on the dashboard.
 *
 * No imports from server-only code — safe to use in both client and server.
 * All functions take plain data and return plain data, making them easy to test.
 */

export type ChecklistCounts = {
  products: number;
  users: number;
  quotes: number;
  orders: number;
};

export type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  href: string;
  /** Description shown when the item is not done yet. */
  hint: string;
};

/**
 * Build the Getting Started checklist from live DB counts.
 *
 * Rules:
 *  - "Redeem key"    — always done once the company exists (no separate check needed).
 *  - "Import masters" — done when products > 0.
 *  - "Add your team"  — done when users > 1 (more than just the owner).
 *  - "Create a quote" — done when quotes > 0.
 *  - "Record an order"— done when orders > 0.
 */
export function buildChecklist(counts: ChecklistCounts): ChecklistItem[] {
  return [
    {
      key: "key",
      label: "Redeem your product key",
      done: true,
      href: "/settings",
      hint: "Your product key has already been redeemed.",
    },
    {
      key: "masters",
      label: "Import your master data",
      done: counts.products > 0,
      href: "/import?welcome=1",
      hint: "Add products, customers and suppliers so quotes fill in automatically.",
    },
    {
      key: "team",
      label: "Add your first team member",
      done: counts.users > 1,
      href: "/team",
      hint: "Invite your sales staff or store managers.",
    },
    {
      key: "quote",
      label: "Create your first quote",
      done: counts.quotes > 0,
      href: "/quotes/new",
      hint: "Build a professional quote for a customer in under a minute.",
    },
    {
      key: "order",
      label: "Record your first order",
      done: counts.orders > 0,
      href: "/orders",
      hint: "Confirm a quote to create an order and keep your pipeline moving.",
    },
  ];
}

/**
 * Returns true when all checklist items are done — used to auto-dismiss.
 */
export function isChecklistComplete(counts: ChecklistCounts): boolean {
  return buildChecklist(counts).every((item) => item.done);
}

/**
 * Returns how many items are done (for the progress fraction).
 */
export function checklistProgress(counts: ChecklistCounts): { done: number; total: number } {
  const items = buildChecklist(counts);
  return { done: items.filter((i) => i.done).length, total: items.length };
}
