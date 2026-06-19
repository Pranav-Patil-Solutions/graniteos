"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus, ChevronDown, FileText, Boxes, Banknote, ShoppingCart, ListTodo,
} from "lucide-react";

type Action = { href: string; label: string; icon: typeof FileText };

/** "+ New" command menu on the dashboard — fast access to the create flows. */
export default function DashboardQuickActions({ isOwner }: { isOwner: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const actions: Action[] = [
    { href: "/quotes/new", label: "New quote", icon: FileText },
    { href: "/inventory", label: "Add stock", icon: Boxes },
    { href: "/batch-payment", label: "Record payment", icon: Banknote },
    ...(isOwner
      ? [
          { href: "/purchase-orders/new", label: "New purchase order", icon: ShoppingCart },
          { href: "/daybook", label: "Add a task", icon: ListTodo },
        ]
      : []),
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-sm font-bold text-graphite-900 hover:brightness-110 transition"
      >
        <Plus className="w-4 h-4" /> New
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-2xl border border-graphite-600 bg-graphite-900/95 backdrop-blur shadow-2xl shadow-black/50 p-1.5 z-50"
        >
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.06] hover:text-gold transition-colors"
              >
                <Icon className="w-4 h-4 shrink-0 text-gold" />
                {a.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
