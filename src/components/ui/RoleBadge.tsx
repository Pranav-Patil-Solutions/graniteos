import type { Role } from "@/lib/roles";
import { ROLE_LABELS } from "@/lib/roles";

const STYLES: Record<Role, string> = {
  owner: "border-gold/50 text-gold bg-gold/[0.06]",
  sales_manager: "border-blue-400/40 text-blue-300 bg-blue-500/[0.06]",
  store_manager: "border-orange-400/40 text-orange-300 bg-orange-500/[0.06]",
  fabrication_supervisor: "border-purple-400/40 text-purple-300 bg-purple-500/[0.06]",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${STYLES[role]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {ROLE_LABELS[role]}
    </span>
  );
}
