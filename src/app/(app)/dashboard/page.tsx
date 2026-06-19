import Link from "next/link";
import { Settings, Search } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { RoleBadge } from "@/components/ui/RoleBadge";
import SignOutButton from "@/components/auth/SignOutButton";
import MorningCard from "@/components/dashboard/MorningCard";
import GettingStartedCard from "@/components/dashboard/GettingStartedCard";
import CoachMarksTour from "@/components/dashboard/CoachMarksTour";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import DashboardTodo from "@/components/dashboard/DashboardTodo";
import { groupTasks, type TaskRow } from "@/lib/tasks";
import type { ChecklistCounts } from "@/lib/import/checklist";

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

  // Fetch the counts needed by the Getting Started checklist.
  // All fail-safe with defaults — never crash the dashboard.
  let checklistCounts: ChecklistCounts = { products: 0, users: 1, quotes: 0, orders: 0 };
  let openTasks: { id: string; title: string; carriedDays: number }[] = [];
  let moreTasks = 0;
  if (isOwner) {
    const [prodRes, usersRes, quotesRes, ordersRes] = await Promise.allSettled([
      supabase.from("products").select("*", { count: "exact", head: true }).eq("active", true),
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("quotes").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
    ]);

    function safeCount(r: PromiseSettledResult<{ count: number | null; error: unknown }>): number {
      return r.status === "fulfilled" ? (r.value.count ?? 0) : 0;
    }

    checklistCounts = {
      products: safeCount(prodRes as PromiseSettledResult<{ count: number | null; error: unknown }>),
      users: safeCount(usersRes as PromiseSettledResult<{ count: number | null; error: unknown }>),
      quotes: safeCount(quotesRes as PromiseSettledResult<{ count: number | null; error: unknown }>),
      orders: safeCount(ordersRes as PromiseSettledResult<{ count: number | null; error: unknown }>),
    };

    // Open Daybook tasks for the dashboard to-do (fail-safe; never crash).
    const { data: taskData } = await supabase
      .from("daybook_tasks")
      .select("id, title, status, created_at, completed_at")
      .order("created_at", { ascending: true });
    const { open } = groupTasks((taskData ?? []) as TaskRow[], new Date());
    openTasks = open.slice(0, 5).map((t) => ({ id: t.id, title: t.title, carriedDays: t.carriedDays }));
    moreTasks = Math.max(0, open.length - openTasks.length);
  }

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 lg:px-8 pt-12 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{greeting()},</p>
          <h1 className="text-2xl font-bold text-white">{user.name}</h1>
          <p className="text-sm text-slate-400">{company?.name ?? ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <DashboardQuickActions isOwner={isOwner} />
          {isOwner && (
            <Link href="/settings" aria-label="Settings" className="text-slate-400 hover:text-gold">
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

      {/* Dashboard to-do — top open Daybook tasks, completable inline (owners) */}
      {isOwner && <DashboardTodo initial={openTasks} moreCount={moreTasks} />}

      {/* Getting Started checklist (owners only — client component, localStorage-backed) */}
      {isOwner && <GettingStartedCard counts={checklistCounts} />}

      <p className="mt-6 text-center text-xs text-slate-500 lg:hidden">
        Tap <span className="text-gold font-semibold">☰</span> at the top-left for all sections.
      </p>

      {/* First-visit coach-marks tour (owners only) */}
      {isOwner && <CoachMarksTour />}
    </div>
  );
}
