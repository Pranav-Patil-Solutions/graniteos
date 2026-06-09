import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import ImportWizard from "@/components/import/ImportWizard";

export default async function ImportPage() {
  const me = await requireSession();
  if (!can(me.role, "viewCompanySettings")) redirect("/dashboard");
  return <ImportWizard />;
}
