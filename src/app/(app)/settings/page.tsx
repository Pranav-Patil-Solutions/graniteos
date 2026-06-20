import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Upload, ChevronRight, Package, ShieldCheck, KeyRound } from "lucide-react";
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
    .select("name, legal_name, city, gst_number, gst_state_code, pan, upi_id, quote_terms_text")
    .eq("id", me.company_id)
    .single();

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-12 pb-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ChevronLeft className="w-4 h-4" /> Dashboard
      </Link>
      <h1 className="mt-2 font-display text-[1.9rem] lg:text-[2.15rem] font-semibold tracking-tight text-ondark">Company settings</h1>
      <p className="text-sm text-slate-400 mb-5">Your UPI ID powers the WhatsApp pay-links.</p>

      <Link
        href="/import"
        className="mb-5 flex items-center gap-3 rounded-2xl border border-graphite-600 bg-white/[0.04] backdrop-blur p-4 hover:border-gold/60 transition-colors"
      >
        <span className="text-gold"><Upload className="w-5 h-5" /></span>
        <span className="flex-1">
          <span className="block text-white font-semibold">Import from Excel</span>
          <span className="block text-xs text-slate-400 mt-0.5">
            Bring in customers, suppliers, blocks, slabs &amp; jobs from a spreadsheet.
          </span>
        </span>
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </Link>

      <Link
        href="/products"
        className="mb-5 flex items-center gap-3 rounded-2xl border border-graphite-600 bg-white/[0.04] backdrop-blur p-4 hover:border-gold/60 transition-colors"
      >
        <span className="text-gold"><Package className="w-5 h-5" /></span>
        <span className="flex-1">
          <span className="block text-white font-semibold">Products</span>
          <span className="block text-xs text-slate-400 mt-0.5">
            Create your own reusable products with default rate, unit, HSN &amp; GST.
          </span>
        </span>
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </Link>

      <Link
        href="/settings/access-control"
        className="mb-5 flex items-center gap-3 rounded-2xl border border-graphite-600 bg-white/[0.04] backdrop-blur p-4 hover:border-gold/60 transition-colors"
      >
        <span className="text-gold"><ShieldCheck className="w-5 h-5" /></span>
        <span className="flex-1">
          <span className="block text-white font-semibold">Access Control</span>
          <span className="block text-xs text-slate-400 mt-0.5">
            Control what each role (Sales, Store, Fabrication) can see and edit.
          </span>
        </span>
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </Link>

      <Link
        href="/settings/security"
        className="mb-5 flex items-center gap-3 rounded-2xl border border-graphite-600 bg-white/[0.04] backdrop-blur p-4 hover:border-gold/60 transition-colors"
      >
        <span className="text-gold"><KeyRound className="w-5 h-5" /></span>
        <span className="flex-1">
          <span className="block text-white font-semibold">Security &amp; 2FA</span>
          <span className="block text-xs text-slate-400 mt-0.5">
            Turn on two-factor sign-in with an authenticator app for extra protection.
          </span>
        </span>
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </Link>

      {company && (
        <SettingsForm
          company={
            company as {
              name: string;
              legal_name: string | null;
              city: string | null;
              gst_number: string | null;
              gst_state_code: string | null;
              pan: string | null;
              upi_id: string | null;
              quote_terms_text: string | null;
            }
          }
        />
      )}
    </div>
  );
}
