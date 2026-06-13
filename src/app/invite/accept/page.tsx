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
  if ("error" in res) {
    return (
      <div className="min-h-screen grid place-items-center px-5 bg-graphite-900">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-bold text-white">Invite problem</h1>
          <p className="mt-2 text-sm text-red-300">{res.error}</p>
          <a href="/login" className="mt-6 inline-block text-sm text-gold underline">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }
  redirect("/dashboard");
}
