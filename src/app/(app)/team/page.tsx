import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import InviteForm from "@/components/team/InviteForm";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function TeamPage() {
  const me = await requireSession();
  if (!can(me.role, "inviteTeamMember")) redirect("/dashboard");

  const supabase = await createClient();

  // Fetch members
  const { data: members } = await supabase
    .from("users")
    .select("id, name, phone, role, status")
    .order("created_at", { ascending: true });

  const list = (members ?? []) as {
    id: string;
    name: string;
    phone: string | null;
    role: Role;
    status: string;
  }[];

  // Fetch seat limit — gracefully tolerate missing max_users column (migration 0020 not applied).
  let maxUsers: number | null = null;
  try {
    const { data: keyData } = await supabase
      .from("product_keys")
      .select("*")
      .eq("company_id", me.company_id)
      .maybeSingle();

    // If the column exists, use it; if not (column missing), we get undefined.
    if (keyData && typeof (keyData as Record<string, unknown>)["max_users"] === "number") {
      maxUsers = (keyData as Record<string, unknown>)["max_users"] as number;
    }
  } catch {
    // Migration 0020 not yet applied — hide the seat chip.
  }

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-12">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Team</h1>
          <p className="text-sm text-slate-400">{list.length} member(s)</p>
        </div>
        {maxUsers !== null && (
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              list.length >= maxUsers
                ? "bg-red-500/15 border-red-500/30 text-red-300"
                : "bg-granite-green2/15 border-granite-green2/30 text-granite-green2"
            }`}
          >
            {list.length} of {maxUsers} seats used
          </span>
        )}
      </div>

      <div className="mt-5 space-y-2">
        {list.length === 1 && (
          <EmptyState
            heading="Just you so far"
            subtext="Invite your sales managers, store managers and fabrication supervisors. Each gets a personalised invite link."
            actionLabel="Invite team members from Excel"
            actionHref="/import"
          />
        )}
        {list.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-2xl border border-graphite-600 bg-white/[0.04] p-3"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-granite-green to-granite-green2 text-white grid place-items-center font-bold">
              {m.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">{m.name}</p>
              <p className="text-xs text-slate-500">{m.phone ?? "—"}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">{ROLE_LABELS[m.role]}</span>
              {m.status === "invited" && (
                <p className="text-[11px] text-amber-400 font-medium">Pending</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <InviteForm />
    </div>
  );
}
