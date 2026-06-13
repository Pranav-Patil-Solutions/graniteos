"use client";

/**
 * InstallBanner — shown on mobile only (lg:hidden).
 *
 * – Android/Chrome: listens for the `beforeinstallprompt` event and shows a
 *   one-tap "Install GraniteOS" button that triggers the native prompt.
 * – iOS Safari: no beforeinstallprompt; shows a plain text hint instead
 *   ("Tap Share → Add to Home Screen").
 * – Dismiss stores a flag in localStorage key `gos_install_hint_v1` so the
 *   banner never reappears on the same device.
 */

import { useEffect, useState } from "react";

const DISMISS_KEY = "gos_install_hint_v1";

// Chrome fires this event when the app is installable.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint]       = useState(false);
  const [dismissed, setDismissed]           = useState(true); // start hidden; update after mount

  useEffect(() => {
    // Don't show if already dismissed or already installed
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {}
    if (isInStandaloneMode()) return;

    if (isIos()) {
      setShowIosHint(true);
      setDismissed(false);
      return;
    }

    // Register the SW so Chrome can evaluate install-ability
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration failure is non-fatal; app still works
      });
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") dismiss();
    else setDismissed(false); // keep banner visible if they declined
  };

  // Hidden once dismissed or on desktop
  if (dismissed || (!deferredPrompt && !showIosHint)) return null;

  return (
    <div
      className="lg:hidden fixed bottom-20 inset-x-3 z-50 rounded-xl border border-white/10 bg-graphite-800/95 backdrop-blur-md shadow-xl p-4 flex items-start gap-3"
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      <div className="shrink-0 w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={32} height={32} className="rounded-md" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ondark leading-tight">Install GraniteOS</p>
        {showIosHint ? (
          <p className="text-xs text-ondark-muted mt-0.5 leading-snug">
            Tap the <strong className="text-ondark">Share</strong> button, then{" "}
            <strong className="text-ondark">Add to Home Screen</strong> to install.
          </p>
        ) : (
          <p className="text-xs text-ondark-muted mt-0.5 leading-snug">
            Add to your home screen for a faster, full-screen experience.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex flex-col gap-1.5">
        {!showIosHint && deferredPrompt && (
          <button
            onClick={install}
            className="px-3 py-1.5 rounded-lg bg-gold text-graphite-900 text-xs font-semibold hover:bg-gold/90 active:scale-95 transition"
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          className="px-3 py-1.5 rounded-lg bg-white/5 text-ondark-muted text-xs hover:bg-white/10 active:scale-95 transition"
          aria-label="Dismiss install banner"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
