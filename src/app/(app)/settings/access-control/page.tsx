import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { loadAccessConfig } from "@/lib/access-control-guard";
import AccessControlGrid from "@/components/settings/AccessControlGrid";

export const dynamic = "force-dynamic";

export default async function AccessControlPage() {
  const me = await requireSession();
  if (!can(me.role, "viewCompanySettings")) redirect("/dashboard");

  // Detect whether migration 0021 has been applied.
  const supabase = await createClient();
  const { error: tableCheck } = await supabase
    .from("access_control")
    .select("company_id")
    .eq("company_id", me.company_id)
    .limit(1);

  const migrationMissing =
    !!tableCheck && /does not exist|schema cache|access_control/i.test(tableCheck.message);

  // Load current config (falls back to DEFAULT_CONFIG on error).
  const config = await loadAccessConfig(me.company_id);

  return (
    <div className="max-w-2xl lg:max-w-6xl mx-auto px-4 pt-12 pb-8">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ChevronLeft className="w-4 h-4" /> Settings
      </Link>

      <div className="mt-2 flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-gold" />
        <h1 className="text-2xl font-bold text-white">Access Control</h1>
      </div>
      <p className="mt-1 text-sm text-slate-400">
        Control what each role can see and edit. Changes take effect immediately — no redeploy
        needed.
      </p>

      <div className="mt-6">
        {migrationMissing ? (
          <Card>
            <p className="text-sm font-semibold text-amber-300">One-time setup needed</p>
            <p className="mt-1 text-sm text-slate-400">
              The access control table isn&apos;t in the database yet. Apply migration{" "}
              <code className="text-slate-200">0021_access_control.sql</code> in the Supabase SQL
              editor, then reload this page.
            </p>
          </Card>
        ) : (
          <AccessControlGrid initialConfig={config} />
        )}
      </div>
    </div>
  );
}
