import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import VendorPaymentView from "@/components/procurement/VendorPaymentView";

export const dynamic = "force-dynamic";

export default async function VendorPaymentPage() {
  await requireSession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("parties")
    .select("id, name")
    .eq("kind", "supplier")
    .order("name", { ascending: true });

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-12 pb-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white">Vendor Payments</h1>
        <p className="text-sm text-slate-400">
          Pay a supplier&apos;s open bills — overdue first, auto-allocated oldest bill first.
        </p>
      </div>
      <VendorPaymentView suppliers={(data ?? []) as { id: string; name: string }[]} />
    </div>
  );
}
