import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const me = await requireSession();
  if (!can(me.role, "viewCompanySettings")) redirect("/dashboard");

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("name, city, gst_number, upi_id, quote_terms_text")
    .eq("id", me.company_id)
    .single();

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ChevronLeft className="w-4 h-4" /> Dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-white">Company settings</h1>
      <p className="text-sm text-slate-400 mb-5">Your UPI ID powers the WhatsApp pay-links.</p>
      {company && (
        <SettingsForm
          company={
            company as {
              name: string;
              city: string | null;
              gst_number: string | null;
              upi_id: string | null;
              quote_terms_text: string | null;
            }
          }
        />
      )}
    </div>
  );
}
