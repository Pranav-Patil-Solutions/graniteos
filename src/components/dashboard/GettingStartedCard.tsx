"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from "lucide-react";
import { buildChecklist, isChecklistComplete, type ChecklistCounts } from "@/lib/import/checklist";

const LS_KEY = "gos_onboarding_v1";

type StoredState = {
  dismissed: boolean;
  collapsed: boolean;
};

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as StoredState;
  } catch {}
  return { dismissed: false, collapsed: false };
}

function saveState(s: StoredState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {}
}

interface Props {
  counts: ChecklistCounts;
}

/**
 * Getting Started checklist card for new companies.
 *
 * - Reads/writes localStorage key "gos_onboarding_v1" — no DB migration needed.
 * - Collapses on click, dismisses forever via the X button.
 * - Auto-hides once all items are done AND the user has dismissed.
 */
export default function GettingStartedCard({ counts }: Props) {
  const [state, setState] = useState<StoredState>({ dismissed: false, collapsed: false });
  const [mounted, setMounted] = useState(false);

  // Only read localStorage after mount (avoid SSR mismatch).
  useEffect(() => {
    setState(loadState());
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (state.dismissed) return null;

  const items = buildChecklist(counts);
  const allDone = isChecklistComplete(counts);
  const doneCount = items.filter((i) => i.done).length;

  function toggle() {
    const next = { ...state, collapsed: !state.collapsed };
    setState(next);
    saveState(next);
  }

  function dismiss() {
    const next = { ...state, dismissed: true };
    setState(next);
    saveState(next);
  }

  return (
    <div className="mt-5 rounded-2xl border border-gold/20 bg-gradient-to-br from-[#14110a] to-graphite-800 overflow-hidden">
      {/* Header row — toggle and dismiss are SIBLING buttons (a <button> can't
          nest inside another <button> without a hydration error). */}
      <div className="w-full flex items-center justify-between px-4 py-3">
        <button
          onClick={toggle}
          className="flex flex-1 min-w-0 items-center justify-between gap-2 text-left"
          aria-label={state.collapsed ? "Expand getting started checklist" : "Collapse checklist"}
        >
          <span className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-gold uppercase tracking-wide">Getting started</span>
            <span className={`text-xs font-semibold ${allDone ? "text-emerald-300" : "text-slate-300"}`}>
              {doneCount}/{items.length}
              {allDone ? " complete ✓" : ""}
            </span>
          </span>
          {state.collapsed ? (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          )}
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss getting started card"
          className="ml-2 p-0.5 text-slate-500 hover:text-slate-300 rounded shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/[0.08]">
        <div
          className="h-full bg-granite-green2 transition-all duration-500"
          style={{ width: `${(doneCount / items.length) * 100}%` }}
        />
      </div>

      {/* Checklist items */}
      {!state.collapsed && (
        <div className="px-4 py-3 space-y-2.5">
          {allDone && (
            <p className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All set! You can dismiss this card now.
            </p>
          )}
          {items.map((item) => (
            <div key={item.key} className="flex items-start gap-2.5">
              {item.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                {item.done ? (
                  <span className="text-sm text-slate-300 line-through">{item.label}</span>
                ) : (
                  <Link
                    href={item.href}
                    className="text-sm text-white font-medium hover:text-gold transition-colors"
                  >
                    {item.label}
                  </Link>
                )}
                {!item.done && (
                  <p className="text-xs text-slate-400 mt-0.5">{item.hint}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
