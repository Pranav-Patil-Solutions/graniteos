import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import MarketingHelper, { type SegCustomer, type Segments } from "@/components/marketing/MarketingHelper";

const DAY = 24 * 60 * 60 * 1000;
const ms = (d?: string | null) => (d ? new Date(d.length <= 10 ? d + "T00:00:00" : d).getTime() : 0);

export default async function MarketingPage() {
  const me = await requireSession();
  if (!can(me.role, "createQuote")) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: company }, { data: parties }, { data: invoices }, { data: orders }, { data: quotes }, { data: payments }] =
    await Promise.all([
      supabase.from("companies").select("name").eq("id", me.company_id).single(),
      supabase.from("parties").select("id, name, phone, notify_new_stock, opening_balance_paise, created_at").eq("kind", "customer").order("name"),
      supabase.from("invoices").select("customer_id, total_paise, invoice_date"),
      supabase.from("orders").select("customer_id, created_at"),
      supabase.from("quotes").select("customer_id, status, total_paise, quote_date"),
      supabase.from("payments").select("customer_id, amount_paise, paid_on"),
    ]);

  const I = invoices ?? [];
  const O = orders ?? [];
  const Q = quotes ?? [];
  const PAY = payments ?? [];
  const now = Date.now();

  type Row = SegCustomer & { revenue: number; lastMs: number; firstOrderMs: number; hasOrder: boolean; openQuoteValue: number; hasOpenQuote: boolean };

  const rows: Row[] = (parties ?? [])
    .filter((c) => (c.phone as string | null)?.trim())
    .map((c) => {
      const id = c.id as string;
      const inv = I.filter((x) => x.customer_id === id);
      const pays = PAY.filter((x) => x.customer_id === id);
      const ords = O.filter((x) => x.customer_id === id);
      const qs = Q.filter((x) => x.customer_id === id);
      const revenue = inv.reduce((n, x) => n + Number(x.total_paise), 0);
      const paid = pays.reduce((n, x) => n + Number(x.amount_paise), 0);
      const outstanding = Math.max(0, Number(c.opening_balance_paise) + revenue - paid);
      const openQuotes = qs.filter((q) => q.status === "draft" || q.status === "sent");
      const dates = [
        ...inv.map((x) => ms(x.invoice_date as string)),
        ...ords.map((x) => ms(x.created_at as string)),
        ...qs.map((x) => ms(x.quote_date as string)),
        ...pays.map((x) => ms(x.paid_on as string)),
      ].filter(Boolean);
      const lastMs = dates.length ? Math.max(...dates) : 0;
      const firstOrderMs = ords.length ? Math.min(...ords.map((x) => ms(x.created_at as string)).filter(Boolean)) : 0;
      return {
        id,
        name: c.name as string,
        phone: c.phone as string,
        optIn: (c.notify_new_stock as boolean | undefined) ?? true,
        outstanding,
        days: lastMs ? Math.floor((now - lastMs) / DAY) : null,
        revenue,
        lastMs,
        firstOrderMs,
        hasOrder: ords.length > 0,
        openQuoteValue: openQuotes.reduce((n, q) => n + Number(q.total_paise), 0),
        hasOpenQuote: openQuotes.length > 0,
      };
    });

  const strip = (r: Row): SegCustomer => ({ id: r.id, name: r.name, phone: r.phone, optIn: r.optIn, outstanding: r.outstanding, days: r.days, revenue: r.revenue });

  const segments: Segments = {
    hotLeads: rows.filter((r) => r.hasOpenQuote && !r.hasOrder).sort((a, b) => b.openQuoteValue - a.openQuoteValue).map(strip),
    top: rows.filter((r) => r.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 8).map(strip),
    dormant: rows.filter((r) => r.hasOrder && r.days !== null && r.days > 60).sort((a, b) => b.revenue - a.revenue).map(strip),
    newCust: rows.filter((r) => r.hasOrder && r.firstOrderMs && now - r.firstOrderMs <= 30 * DAY).sort((a, b) => b.firstOrderMs - a.firstOrderMs).map(strip),
    slowPayers: rows.filter((r) => r.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding).map(strip),
  };

  return (
    <>
      <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
          <ChevronLeft className="w-4 h-4" /> Dashboard
        </Link>
      </div>
      <MarketingHelper
        companyId={me.company_id}
        companyName={company?.name ?? "our showroom"}
        segments={segments}
        totalCustomers={rows.length}
      />
    </>
  );
}
