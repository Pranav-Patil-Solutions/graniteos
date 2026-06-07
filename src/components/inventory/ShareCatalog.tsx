"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export default function ShareCatalog({ companyId }: { companyId: string }) {
  const [copied, setCopied] = useState(false);

  function url() {
    const base =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    return `${base}/catalog/${companyId}`;
  }

  async function share() {
    const link = url();
    const text = `Here's our live stock catalogue: ${link}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Stock catalogue", url: link });
        return;
      }
    } catch {
      /* fall through to copy */
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 text-gold px-3 py-2 text-sm font-bold hover:bg-gold/10"
    >
      {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      {copied ? "Link copied" : "Share catalogue"}
    </button>
  );
}
