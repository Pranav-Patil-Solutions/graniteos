import Link from "next/link";
import { Boxes, FileText, Receipt, Users, UserRound, Truck, Wallet } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { TiltCard } from "@/components/ui/TiltCard";
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
    <div className="max-w-lg mx-auto px-4 pt-12" style={{ perspective: 1000 }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{greeting()},</p>
          <h1 className="text-2xl font-bold text-white">{user.name}</h1>
          <p className="text-sm text-slate-400">{company?.name ?? ""}</p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-3">
        <RoleBadge role={user.role} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link href="/inventory" className="block">
          <TiltCard>
            <Boxes className="text-gold" />
            <p className="font-bold text-white mt-2">Stock</p>
            <p className="text-xs text-slate-400 mt-1">Blocks &amp; slabs</p>
          </TiltCard>
        </Link>
        <Link href="/parties" className="block">
          <TiltCard>
            <UserRound className="text-gold" />
            <p className="font-bold text-white mt-2">Customers</p>
            <p className="text-xs text-slate-400 mt-1">CRM &amp; udhaar</p>
          </TiltCard>
        </Link>
        <Link href="/parties?tab=suppliers" className="block">
          <TiltCard>
            <Truck className="text-gold" />
            <p className="font-bold text-white mt-2">Suppliers</p>
            <p className="text-xs text-slate-400 mt-1">Quarries &amp; vendors</p>
          </TiltCard>
        </Link>
        <Link href="/quotes" className="block">
          <TiltCard>
            <Receipt className="text-gold" />
            <p className="font-bold text-white mt-2">Quotes</p>
            <p className="text-xs text-slate-400 mt-1">GST &amp; pricing</p>
          </TiltCard>
        </Link>
        <Link href="/orders" className="block">
          <TiltCard>
            <FileText className="text-gold" />
            <p className="font-bold text-white mt-2">Orders</p>
            <p className="text-xs text-slate-400 mt-1">Confirmed sales</p>
          </TiltCard>
        </Link>
        <Link href="/money" className="block">
          <TiltCard>
            <Wallet className="text-gold" />
            <p className="font-bold text-white mt-2">Money</p>
            <p className="text-xs text-slate-400 mt-1">Bills &amp; udhaar</p>
          </TiltCard>
        </Link>
        {isOwner && (
          <Link href="/team" className="block">
            <TiltCard wow>
              <Users className="text-gold" />
              <p className="font-bold text-gold mt-2">Team</p>
              <p className="text-xs text-gold/70 mt-1">Manage &amp; invite</p>
            </TiltCard>
          </Link>
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-gold/[0.06] border border-[#3a3320] p-4 text-sm text-gold">
        ✅ Foundation (Slice 1) — auth, company setup, role-aware navigation, and team
        management. Business modules land in later slices.
      </div>
    </div>
  );
}
