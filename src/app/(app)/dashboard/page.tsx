import Link from "next/link";
import { Settings, Search } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { RoleBadge } from "@/components/ui/RoleBadge";
import SignOutButton from "@/components/auth/SignOutButton";
import MorningCard from "@/components/dashboard/MorningCard";

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
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{greeting()},</p>
          <h1 className="text-2xl font-bold text-white">{user.name}</h1>
          <p className="text-sm text-slate-400">{company?.name ?? ""}</p>
        </div>
        <div className="flex items-center gap-3">
          {isOwner && (
            <Link href="/settings" className="text-slate-400 hover:text-gold">
              <Settings className="w-5 h-5" />
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>

      <div className="mt-3">
        <RoleBadge role={user.role} />
      </div>

      {/* search everywhere — customers, stock, invoices, quotes, orders */}
      <form action="/search" method="get" className="relative mt-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          name="q"
          placeholder="Search customers, stock, invoices…"
          aria-label="Search everything"
          className="w-full !pl-10 text-base focus:border-gold outline-none"
        />
      </form>

      <MorningCard role={user.role} />

      <p className="mt-6 text-center text-xs text-slate-500">
        Tap <span className="text-gold font-semibold">☰</span> at the top-left for all sections.
      </p>
    </div>
  );
}
