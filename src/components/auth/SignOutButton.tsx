"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/actions/auth";

export default function SignOutButton() {
  const router = useRouter();
  async function onClick() {
    await signOutAction();
    router.replace("/login");
    router.refresh();
  }
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 !min-h-0"
    >
      <LogOut className="w-4 h-4" /> Sign out
    </button>
  );
}
