import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { isWhatsAppConnected } from "@/lib/whatsapp";
import StockAlertBroadcast, { type AlertCustomer, type RecentSlab } from "@/components/stock/StockAlertBroadcast";

export default async function StockAlertPage() {
  const me = await requireSession();
  if (!can(me.role, "createQuote")) redirect("/dashboard");

  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: company }, { data: slabs }, { data: customers }] = await Promise.all([
    supabase.from("companies").select("name, phone").eq("id", me.company_id).single(),
    supabase
      .from("slabs")
      .select("created_at, status, blocks(material, color)")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabase
      .from("parties")
      .select("id, name, phone, notify_new_stock")
      .eq("kind", "customer")
      .order("name"),
  ]);

  const recent: RecentSlab[] = (slabs ?? [])
    .map((s) => {
      const block = (s as { blocks?: { material?: string; color?: string | null } }).blocks;
      return { material: block?.material ?? "Stock", createdAt: (s.created_at as string) ?? "" };
    })
    .filter((s) => s.material);

  const custs: AlertCustomer[] = (customers ?? [])
    .filter((c) => (c.phone as string | null)?.trim())
    .map((c) => ({
      id: c.id as string,
      name: c.name as string,
      phone: c.phone as string,
      // missing column (pre-migration) reads as undefined → treat as opted-in
      optIn: (c.notify_new_stock as boolean | undefined) ?? true,
    }));

  return (
    <>
      <div className="max-w-lg mx-auto px-4 pt-6">
        <Link href="/inventory" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
          <ChevronLeft className="w-4 h-4" /> Inventory
        </Link>
      </div>
      <StockAlertBroadcast
        companyId={me.company_id}
        companyName={company?.name ?? "our showroom"}
        recent={recent}
        customers={custs}
        whatsappConnected={isWhatsAppConnected()}
      />
    </>
  );
}
