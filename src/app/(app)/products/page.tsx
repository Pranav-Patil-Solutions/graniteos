import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import ProductsManager, { type ProductRow } from "@/components/products/ProductsManager";

export default async function ProductsPage() {
  const me = await requireSession();
  if (!can(me.role, "viewCompanySettings")) redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, hsn_code, uom, default_rate_paise, gst_rate, material, finish, notes")
    .eq("active", true)
    .order("name");

  return (
    <>
      <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
        >
          <ChevronLeft className="w-4 h-4" /> Settings
        </Link>
      </div>
      <ProductsManager products={(data ?? []) as ProductRow[]} />
    </>
  );
}
