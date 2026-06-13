import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import ImportWizard from "@/components/import/ImportWizard";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const me = await requireSession();
  if (!can(me.role, "viewCompanySettings")) redirect("/dashboard");

  const { welcome } = await searchParams;
  const wizardMode = welcome === "1";

  // Fetch live row counts so the wizard can show "2 of 5 done".
  // Each query fails gracefully — count defaults to 0 on error.
  const supabase = await createClient();
  const [productsRes, customersRes, suppliersRes, blocksRes, usersRes] =
    await Promise.allSettled([
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("active", true),
      supabase
        .from("parties")
        .select("*", { count: "exact", head: true })
        .eq("kind", "customer"),
      supabase
        .from("parties")
        .select("*", { count: "exact", head: true })
        .eq("kind", "supplier"),
      supabase.from("blocks").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }),
    ]);

  function safeCount(
    r: PromiseSettledResult<{ count: number | null; error: unknown }>,
  ): number {
    if (r.status === "fulfilled") return r.value.count ?? 0;
    return 0;
  }

  const usersTotal = safeCount(usersRes as PromiseSettledResult<{ count: number | null; error: unknown }>);

  const moduleCounts: Record<string, number> = {
    products: safeCount(productsRes as PromiseSettledResult<{ count: number | null; error: unknown }>),
    customers: safeCount(customersRes as PromiseSettledResult<{ count: number | null; error: unknown }>),
    suppliers: safeCount(suppliersRes as PromiseSettledResult<{ count: number | null; error: unknown }>),
    blocks: safeCount(blocksRes as PromiseSettledResult<{ count: number | null; error: unknown }>),
    // team "done" = at least one non-owner user exists
    team: Math.max(0, usersTotal - 1),
  };

  return <ImportWizard wizardMode={wizardMode} moduleCounts={moduleCounts} />;
}
