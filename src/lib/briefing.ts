import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/roles";

/**
 * The Morning Briefing — the data behind the command center AND the daily push.
 *
 * One source of truth so the screen the owner opens and the notification that
 * pulls them in say exactly the same thing. This is the habit loop's "trigger":
 * a tight set of money/sales/floor signals + the single most important action.
 */

export type BriefingAction = {
  label: string;
  href: string;
  tone: "red" | "gold" | "green";
  /** Short form for a push notification body. */
  push: string;
} | null;

export type Briefing = {
  role: Role;
  // money
  receivablePaise: number;
  overdueCount: number;
  cashIn7Paise: number;
  netGstPaise: number;
  // recent wins (for the celebration layer) — payments since the user was last here
  recentPayments: { amount: number; at: string }[];
  acceptedQuotes7: number;
  // sales
  quotesExpiringSoon: number;
  quotesOpen: number;
  // floor
  jobsReady: number;
  jobsActive: number;
  // stock
  inStock: number;
  // the one thing to do right now
  primaryAction: BriefingAction;
  // a rotating, slightly-different-each-time line (variable reward)
  highlight: string;
};

const DAY = 24 * 60 * 60 * 1000;

export async function getBriefing(
  supabase: SupabaseClient,
  role: Role,
): Promise<Briefing> {
  const [
    { data: parties },
    { data: invoices },
    { data: payments },
    { data: blocks },
    { data: slabs },
    { data: jobs },
    { data: quotes },
  ] = await Promise.all([
    supabase.from("parties").select("id, kind, name, opening_balance_paise"),
    supabase.from("invoices").select("customer_id, total_paise, gst_paise"),
    supabase.from("payments").select("customer_id, amount_paise, paid_on, created_at"),
    supabase.from("blocks").select("cost_paise"),
    supabase.from("slabs").select("status"),
    supabase.from("production_jobs").select("stage"),
    supabase.from("quotes").select("status, valid_until, total_paise, created_at"),
  ]);

  const P = parties ?? [];
  const I = invoices ?? [];
  const PAY = payments ?? [];
  const Q = quotes ?? [];

  // --- Money: receivables + how many customers are behind ---
  const customers = P.filter((p) => p.kind === "customer");
  const invByCust = (cid: string) =>
    I.filter((i) => i.customer_id === cid).reduce((n, i) => n + Number(i.total_paise), 0);
  const payByCust = (cid: string) =>
    PAY.filter((p: { customer_id?: string }) => p.customer_id === cid).reduce(
      (n: number, p: { amount_paise: number }) => n + Number(p.amount_paise),
      0,
    );
  const outstanding = customers.map(
    (c) => Number(c.opening_balance_paise) + invByCust(c.id) - payByCust(c.id),
  );
  const receivablePaise = outstanding.filter((o) => o > 0).reduce((n, o) => n + o, 0);
  const overdueCount = outstanding.filter((o) => o > 0).length;

  const now = Date.now();
  const cashIn7Paise = PAY.filter(
    (p) => new Date(p.paid_on).getTime() >= now - 7 * DAY,
  ).reduce((n, p) => n + Number(p.amount_paise), 0);

  // Recent payments for the "since you were away" celebration (last 7 days,
  // newest first). The client filters these against its own last-seen stamp.
  const recentPayments = PAY.filter(
    (p) => p.created_at && new Date(p.created_at).getTime() >= now - 7 * DAY,
  )
    .map((p) => ({ amount: Number(p.amount_paise), at: p.created_at as string }))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  // --- GST net ---
  const outputGst = I.reduce((n, i) => n + Number(i.gst_paise), 0);
  const inputItc = Math.round(
    (blocks ?? []).reduce((n, b) => n + Number(b.cost_paise), 0) * 0.05,
  );
  const netGstPaise = outputGst - inputItc;

  // --- Sales: open quotes + ones expiring within 3 days (or already lapsed) ---
  const soon = now + 3 * DAY;
  const openQ = Q.filter((q) => q.status === "draft" || q.status === "sent");
  const quotesOpen = openQ.length;
  const quotesExpiringSoon = openQ.filter(
    (q) => q.valid_until && new Date(q.valid_until).getTime() <= soon,
  ).length;
  // quotes has no updated_at; created_at is a reasonable proxy for "fresh wins"
  // (an accepted quote raised in the last week). Keeps the highlight working
  // without querying a column that doesn't exist (was silently 400-ing the whole
  // quotes fetch and zeroing every quote KPI on the morning card).
  const acceptedQuotes7 = Q.filter(
    (q) =>
      q.status === "accepted" &&
      q.created_at &&
      new Date(q.created_at).getTime() >= now - 7 * DAY,
  ).length;

  // --- Floor ---
  const J = jobs ?? [];
  const jobsReady = J.filter((j) => j.stage === "ready").length;
  const jobsActive = J.filter(
    (j) => j.stage !== "dispatched" && j.stage !== "ready",
  ).length;

  // --- Stock ---
  const inStock = (slabs ?? []).filter((s) => s.status === "in_stock").length;

  const rupees = (paise: number) => Math.round(paise / 100).toLocaleString("en-IN");

  // --- The single most important action, by role priority ---
  const candidates: Record<string, BriefingAction> = {
    chase:
      receivablePaise > 0
        ? {
            label: `Chase ₹${rupees(receivablePaise)} from ${overdueCount} ${overdueCount === 1 ? "customer" : "customers"}`,
            href: "/money",
            tone: "red",
            push: `₹${rupees(receivablePaise)} udhaar pending from ${overdueCount} ${overdueCount === 1 ? "customer" : "customers"}`,
          }
        : null,
    followup:
      quotesExpiringSoon > 0
        ? {
            label: `Follow up ${quotesExpiringSoon} ${quotesExpiringSoon === 1 ? "quote" : "quotes"} expiring soon`,
            href: "/quotes",
            tone: "gold",
            push: `${quotesExpiringSoon} ${quotesExpiringSoon === 1 ? "quote is" : "quotes are"} about to expire — follow up`,
          }
        : null,
    dispatch:
      jobsReady > 0
        ? {
            label: `Dispatch ${jobsReady} ${jobsReady === 1 ? "job" : "jobs"} ready to go`,
            href: "/fabrication",
            tone: "green",
            push: `${jobsReady} ${jobsReady === 1 ? "job is" : "jobs are"} ready to dispatch`,
          }
        : null,
  };

  const ORDER: Record<Role, (keyof typeof candidates)[]> = {
    owner: ["chase", "followup", "dispatch"],
    sales_manager: ["followup", "chase", "dispatch"],
    store_manager: ["dispatch", "chase", "followup"],
    fabrication_supervisor: ["dispatch", "followup", "chase"],
  };
  const primaryAction =
    ORDER[role].map((k) => candidates[k]).find(Boolean) ?? null;

  // --- Variable-reward highlight (different depending on the day's data) ---
  const lines: string[] = [];
  if (cashIn7Paise > 0) lines.push(`💰 ₹${rupees(cashIn7Paise)} collected in the last 7 days.`);
  if (acceptedQuotes7 > 0)
    lines.push(`🤝 ${acceptedQuotes7} ${acceptedQuotes7 === 1 ? "quote" : "quotes"} accepted this week — nice run.`);
  if (jobsActive > 0) lines.push(`🏭 ${jobsActive} ${jobsActive === 1 ? "job" : "jobs"} moving through the floor.`);
  if (inStock > 0) lines.push(`📦 ${inStock} slabs ready to sell.`);
  if (netGstPaise < 0) lines.push(`🧾 GST is in your favour by ₹${rupees(-netGstPaise)} this cycle.`);
  if (lines.length === 0) lines.push(`✨ All clear. Quiet day — good time to add stock or chase new leads.`);
  // Rotate by day-of-year so it feels fresh without being random on every paint.
  const doy = Math.floor((now - new Date(new Date().getFullYear(), 0, 0).getTime()) / DAY);
  const highlight = lines[doy % lines.length];

  return {
    role,
    receivablePaise,
    overdueCount,
    cashIn7Paise,
    netGstPaise,
    recentPayments,
    acceptedQuotes7,
    quotesExpiringSoon,
    quotesOpen,
    jobsReady,
    jobsActive,
    inStock,
    primaryAction,
    highlight,
  };
}
