import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "@/actions/team";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/invite/accept?token=${token}`)}`);
  }

  const res = await acceptInvite(token);
  if (res.error) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">Invite problem</h1>
        <p className="mt-2 text-sm text-red-600">{res.error}</p>
        <a href="/login" className="mt-6 inline-block text-sm text-granite-green underline">
          Back to sign in
        </a>
      </div>
    );
  }
  redirect("/dashboard");
}
