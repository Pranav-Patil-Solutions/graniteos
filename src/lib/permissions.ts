import type { Role } from "./roles";

export type Permission =
  | "inviteTeamMember"
  | "deactivateUser"
  | "viewCompanySettings"
  | "createQuote"
  | "confirmOrder"
  | "logInwardReceipt"
  | "manageProduction";

// owner-weighted map; later slices reference these permissions as they land.
const PERMISSIONS: Record<Permission, Role[]> = {
  inviteTeamMember: ["owner"],
  deactivateUser: ["owner"],
  viewCompanySettings: ["owner"],
  createQuote: ["owner", "sales_manager"],
  confirmOrder: ["owner", "sales_manager"],
  logInwardReceipt: ["owner", "store_manager"],
  manageProduction: ["owner", "store_manager", "fabrication_supervisor"],
};

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}
