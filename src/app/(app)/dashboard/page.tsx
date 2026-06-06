import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { ROLE_LABELS, ROLE_BADGE } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import SignOutButton from "@/components/auth/SignOutButton";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireSession();
  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", user.company_id)
    .single();

  const isOwner = can(user.role, "inviteTeamMember");

  return (
    <div className="max-w-lg mx-auto px-4 pt-12">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{greeting()},</p>
          <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
          <p className="text-sm text-slate-500">{company?.name ?? ""}</p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-3">
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${ROLE_BADGE[user.role]}`}
        >
          {ROLE_LABELS[user.role]}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Card title="Inventory" sub="Slice 3" />
        <Card title="Orders" sub="Slice 4" />
        <Card title="Quotes" sub="Slice 4" />
        {isOwner ? (
          <Link
            href="/team"
            className="rounded-2xl border border-granite-green/30 bg-granite-green/5 p-4 block"
          >
            <p className="font-semibold text-granite-green">Team</p>
            <p className="text-xs text-granite-green/70 mt-1">Manage &amp; invite</p>
          </Link>
        ) : (
          <Card title="Payments" sub="Slice 6" />
        )}
      </div>

      <div className="mt-6 rounded-xl bg-granite-green/5 border border-granite-green/20 p-4 text-sm text-granite-green">
        ✅ Foundation (Slice 1) — auth, company setup, role-aware navigation, and
        team management. Business modules land in later slices.
      </div>
    </div>
  );
}

function Card({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}
