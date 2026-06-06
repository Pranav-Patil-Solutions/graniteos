import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import InviteForm from "@/components/team/InviteForm";

export default async function TeamPage() {
  const me = await requireSession();
  if (!can(me.role, "inviteTeamMember")) redirect("/dashboard");

  const supabase = await createClient();
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

  return (
    <div className="max-w-lg mx-auto px-4 pt-12">
      <h1 className="text-2xl font-bold text-slate-900">Team</h1>
      <p className="text-sm text-slate-500">{list.length} member(s)</p>

      <div className="mt-5 space-y-2">
        {list.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3"
          >
            <div className="w-10 h-10 rounded-full bg-granite-green text-white flex items-center justify-center font-semibold">
              {m.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-800">{m.name}</p>
              <p className="text-xs text-slate-400">{m.phone ?? "—"}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">{ROLE_LABELS[m.role]}</span>
              {m.status === "invited" && (
                <p className="text-[11px] text-amber-600 font-medium">Pending</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <InviteForm />
    </div>
  );
}
