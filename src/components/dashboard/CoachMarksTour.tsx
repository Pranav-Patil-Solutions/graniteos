"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChevronRight } from "lucide-react";

const LS_KEY = "gos_onboarding_v1";
const TOUR_SEEN_KEY = "tour_seen";

type StoredState = Record<string, unknown>;

const STEPS = [
  {
    key: "nav",
    title: "Find everything in the menu",
    body: "Tap the ☰ hamburger at the top-left to open the navigation drawer. All sections — Stock, Quotes, Orders, Money — are there.",
    position: "top" as const,
  },
  {
    key: "search",
    title: "Search works everywhere",
    body: "The search bar on this page finds customers, stone slabs, invoices and quotes at once. Try typing a customer name.",
    position: "top" as const,
  },
  {
    key: "import",
    title: "Import your data in minutes",
    body: "Go to Settings → Import Data to download a template, fill it with your existing records, and upload it. We check every row before saving.",
    position: "top" as const,
  },
];

function loadSeen(): boolean {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const s = JSON.parse(raw) as StoredState;
      return s[TOUR_SEEN_KEY] === true;
    }
  } catch {}
  return false;
}

function markSeen() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const s: StoredState = raw ? (JSON.parse(raw) as StoredState) : {};
    s[TOUR_SEEN_KEY] = true;
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {}
}

/**
 * Lightweight first-visit tour for new companies.
 *
 * 3 steps pointing at nav, search and the import wizard.
 * No external tour library — plain React + Tailwind overlay.
 * "Seen" flag lives in the same localStorage key as the onboarding card.
 */
export default function CoachMarksTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (!loadSeen()) {
      // Small delay so the page renders first.
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Move focus into the dialog when it opens (WCAG 2.1.2 / 4.1.2)
  useEffect(() => {
    if (visible) dialogRef.current?.focus();
  }, [visible]);

  // Close on Escape key (WCAG 2.1.2)
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted || !visible) return null;

  const current = STEPS[step];

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      close();
    }
  }

  function close() {
    setVisible(false);
    markSeen();
  }

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Tour card — centred at bottom on mobile */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="fixed z-50 bottom-0 left-0 right-0 mx-auto max-w-sm p-4 outline-none"
        role="dialog"
        aria-modal="true"
        aria-label={`Tour step ${step + 1} of ${STEPS.length}: ${current.title}`}
      >
        <div className="rounded-2xl border border-gold/30 bg-[#1a1610] shadow-2xl p-5">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`block h-1.5 rounded-full transition-all ${
                    i === step ? "w-5 bg-gold" : "w-1.5 bg-white/20"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={close}
              className="p-1 text-slate-500 hover:text-slate-300 rounded"
              aria-label="Close tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base font-bold text-white">{current.title}</h3>
          <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{current.body}</p>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={close}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Skip tour
            </button>
            <button
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gold text-graphite-900 px-4 py-2 text-sm font-bold"
            >
              {step < STEPS.length - 1 ? (
                <>Next <ChevronRight className="w-3.5 h-3.5" /></>
              ) : (
                "Got it!"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
