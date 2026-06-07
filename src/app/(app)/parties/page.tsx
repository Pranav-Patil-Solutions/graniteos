import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PartiesView from "@/components/parties/PartiesView";

export default async function PartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireSession();
  const { tab } = await searchParams;
  const initialKind = tab === "supplier" || tab === "suppliers" ? "supplier" : "customer";

  const supabase = await createClient();
  const { data } = await supabase
    .from("parties")
    .select(
      "id, kind, name, party_type, phone, city, gstin, credit_limit_paise, opening_balance_paise",
    )
    .order("created_at", { ascending: false });

  return <PartiesView parties={(data ?? []) as never} initialKind={initialKind} />;
}
