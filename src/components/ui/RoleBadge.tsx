import type { Role } from "@/lib/roles";
import { ROLE_LABELS } from "@/lib/roles";

const STYLES: Record<Role, string> = {
  owner: "border-gold text-gold",
  sales_manager: "border-blue-400/60 text-blue-300",
  store_manager: "border-orange-400/60 text-orange-300",
  fabrication_supervisor: "border-purple-400/60 text-purple-300",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${STYLES[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
