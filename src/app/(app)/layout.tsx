import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/auth";
import { loadAccessConfig } from "@/lib/access-control-guard";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();
  // Load access config for nav filtering — tolerates missing table (returns defaults).
  const accessConfig = await loadAccessConfig(user.company_id);
  return (
    <AppShell role={user.role} accessConfig={accessConfig}>
      {children}
    </AppShell>
  );
}
