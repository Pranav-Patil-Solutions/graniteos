"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-graphite-900 hover:brightness-110"
    >
      <Printer className="w-4 h-4" /> {label}
    </button>
  );
}
