import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/auth";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();
  return <AppShell role={user.role}>{children}</AppShell>;
}
