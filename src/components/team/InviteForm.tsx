"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteTeamMember } from "@/actions/team";

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
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="font-semibold text-slate-800">Invite a team member</p>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <input
          name="name"
          required
          placeholder="Name"
          className="w-full rounded-xl border border-slate-300 px-4 text-base outline-none focus:border-granite-green"
        />
        <input
          name="phone"
          type="tel"
          required
          placeholder="+91 99999 99999"
          className="w-full rounded-xl border border-slate-300 px-4 text-base outline-none focus:border-granite-green"
        />
        <select
          name="role"
          defaultValue="sales_manager"
          className="w-full rounded-xl border border-slate-300 px-4 text-base bg-white"
        >
          <option value="sales_manager">Sales Manager</option>
          <option value="store_manager">Store Manager</option>
          <option value="fabrication_supervisor">Fabrication Supervisor</option>
        </select>
        {error && (
          <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-100">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-granite-green text-white font-semibold disabled:opacity-60"
        >
          {loading ? "Creating invite..." : "Send invite"}
        </button>
      </form>
      {inviteUrl && (
        <div className="mt-3 rounded-lg bg-granite-green/5 border border-granite-green/20 p-3">
          <p className="text-xs text-granite-green/80">
            Invite link — send it to the member:
          </p>
          <p className="text-xs font-mono break-all text-granite-green">{inviteUrl}</p>
        </div>
      )}
    </div>
  );
}
