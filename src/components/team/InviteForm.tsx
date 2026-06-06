"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteTeamMember } from "@/actions/team";
import { Button } from "@/components/ui/Button";

export default function InviteForm() {
  const router = useRouter();
  const [inviteUrl, setInviteUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setInviteUrl("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await inviteTeamMember({
      name: fd.get("name"),
      phone: fd.get("phone"),
      role: fd.get("role"),
    });
    setLoading(false);
    if (res.error) return setError(res.error);
    setInviteUrl(res.inviteUrl!);
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <div className="mt-6 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4">
      <p className="font-bold text-white">Invite a team member</p>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <input suppressHydrationWarning name="name" required placeholder="Name" className="w-full text-base outline-none focus:border-gold" />
        <input suppressHydrationWarning name="phone" type="tel" required placeholder="+91 99999 99999" className="w-full text-base outline-none focus:border-gold" />
        <select suppressHydrationWarning name="role" defaultValue="sales_manager" className="w-full text-base">
          <option value="sales_manager">Sales Manager</option>
          <option value="store_manager">Store Manager</option>
          <option value="fabrication_supervisor">Fabrication Supervisor</option>
        </select>
        {error && (
          <div className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
            {error}
          </div>
        )}
        <Button type="submit" variant="press" className="w-full" disabled={loading}>
          {loading ? "Creating invite..." : "Send invite"}
        </Button>
      </form>
      {inviteUrl && (
        <div className="mt-3 rounded-lg bg-gold/[0.06] border border-[#3a3320] p-3">
          <p className="text-xs text-gold/80">Invite link — send it to the member:</p>
          <p className="text-xs font-mono break-all text-gold">{inviteUrl}</p>
        </div>
      )}
    </div>
  );
}
