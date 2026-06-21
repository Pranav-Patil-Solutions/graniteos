import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getMfaState } from "@/actions/mfa";
import MfaPanel from "@/components/settings/MfaPanel";

export default async function SecurityPage() {
  await requireSession();
  const state = await getMfaState();

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-12 pb-8">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ChevronLeft className="w-4 h-4" /> Settings
      </Link>
      <h1 className="mt-2 font-display text-[1.9rem] lg:text-[2.15rem] font-semibold tracking-tight text-ondark">Security</h1>
      <p className="text-sm text-slate-400 mb-5">
        Protect your account with a second sign-in step.
      </p>

      <MfaPanel initial={state} />
    </div>
  );
}
