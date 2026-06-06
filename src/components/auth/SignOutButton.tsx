"use client";

import { useRouter } from "next/navigation";
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
      className="text-sm text-slate-500 hover:text-slate-700 !min-h-0"
    >
      Sign out
    </button>
  );
}
