"use client";

import { useEffect } from "react";

/**
 * Next.js route-level error boundary.
 * Catches unhandled errors in the current route segment and its children.
 * Never renders the raw error message or stack to the user.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to the server console only — never expose internals to the client.
    console.error("[GraniteOS] Unhandled route error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-8 text-center shadow-2xl">
        <div className="w-14 h-14 rounded-full border border-red-500/30 bg-red-500/10 grid place-items-center mx-auto mb-5">
          <svg
            className="w-6 h-6 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <h1 className="font-display text-xl font-semibold text-white mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-slate-400 mb-7 leading-relaxed">
          An unexpected error occurred. Your data is safe — please try again or
          return to the home page.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
          >
            Try again
          </button>
          {/* Hard navigation is intentional in an error boundary — a client-side
              <Link> relies on the router, which may itself be in the broken state
              that triggered this boundary. A full reload guarantees recovery. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="px-5 py-2.5 rounded-xl border border-white/15 hover:bg-white/5 text-slate-300 text-sm font-medium transition-colors"
          >
            Go home
          </a>
        </div>
        {error.digest && (
          <p className="mt-5 text-xs text-slate-600">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
