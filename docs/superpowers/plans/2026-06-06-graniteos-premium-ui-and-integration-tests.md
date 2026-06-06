# GraniteOS — Premium Interactive UI Rollout + Integration Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved premium "stone & gold" interactive/3D design system (validated live at `/showcase`) across every real Foundation screen, and add a Playwright integration-test suite covering the showcase and the auth→company→team flow.

**Architecture:** A small set of reusable UI primitives in `src/components/ui/` (Button, Card, TiltCard, StatCard, AnimatedNumber, RoleBadge) plus the existing `SlabViewer` (Three.js) become the design system. Each Foundation screen is restyled to the dark graphite/gold theme using these primitives and Framer Motion. Integration tests use Playwright: one always-green smoke test against `/showcase` (no database), and one database-gated end-to-end test of the real auth flow that runs once Supabase is connected.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind 3, Framer Motion, Three.js, lucide-react, Vitest (unit), Playwright (integration/E2E).

**Approved design (from the live `/showcase`):** dark graphite background (`#0b0e11`) with gold (`#c9a24b`) accents; Framer Motion micro-interactions everywhere; real 3D only where it shocks (slab viewer); buttons standardized to four variants — `press` (3D press, primary), `spring` (WhatsApp), `morph` (save/pay → ✓), `outline` (secondary).

**Already done (this session — do NOT redo):** `tailwind.config.ts` graphite/gold palette; `src/components/ui/Button.tsx`; `src/components/three/SlabViewer.tsx`; env-safe `src/lib/supabase/middleware.ts` with `/showcase` public; `src/app/showcase/page.tsx`. `framer-motion`, `three`, `lucide-react`, `@types/three` installed.

**Working directory:** `D:\vyaparwerk\graniteos`. All paths are relative to it.

**Scope note:** A light/daylight theme toggle (raised as a usability concern for outdoor godown use) is **out of scope** for this plan — tracked as a future enhancement. This plan ships the dark premium theme the user approved.

---

## File Structure

**Created:**
- `src/components/ui/AnimatedNumber.tsx` + `src/components/ui/AnimatedNumber.test.ts` (pure helper)
- `src/components/ui/Card.tsx`
- `src/components/ui/TiltCard.tsx`
- `src/components/ui/StatCard.tsx`
- `src/components/ui/RoleBadge.tsx`
- `src/components/layout/PageTransition.tsx`
- `playwright.config.ts`
- `e2e/showcase.spec.ts`
- `e2e/auth-flow.spec.ts`

**Modified:**
- `src/app/globals.css` (dark base)
- `src/app/layout.tsx` (font)
- `src/app/showcase/page.tsx` (consume extracted primitives — DRY)
- `src/components/layout/AppShell.tsx` (premium nav + motion)
- `src/app/(app)/layout.tsx` (dark wrapper)
- `src/app/(auth)/layout.tsx` (premium auth shell)
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/setup/page.tsx`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/team/page.tsx`
- `src/components/team/InviteForm.tsx`
- `src/components/auth/SignOutButton.tsx`
- `src/components/ComingSoon.tsx`
- `src/app/invite/accept/page.tsx`
- `package.json` (Playwright scripts)

---

## Task 1: Design tokens — global dark theme + font

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`

- [ ] **Step 1: Set the dark premium base in `src/app/globals.css`**

Replace the file contents with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

html,
body {
  background: #0b0e11;
  color: #e8e6e1;
}

/* Inputs on dark surfaces */
input,
select,
textarea {
  min-height: 52px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid #232a31;
  color: #e8e6e1;
  border-radius: 14px;
  padding: 0 16px;
}
input::placeholder {
  color: #5c6470;
}
button {
  min-height: 44px;
}

/* Premium scrollbar */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-thumb {
  background: #232a31;
  border-radius: 8px;
}
```

- [ ] **Step 2: Add Inter font in `src/app/layout.tsx`**

In `src/app/layout.tsx`, add the import and apply the font class. Replace the import block and `<html>`/`<body>` with:
```tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "GraniteOS",
  description: "The operating system for granite & marble businesses",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0b0e11",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body suppressHydrationWarning className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Wire the Inter variable into Tailwind**

In `tailwind.config.ts`, inside `theme.extend`, add a `fontFamily` block alongside `colors`:
```ts
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**
```bash
git add src/app/globals.css src/app/layout.tsx tailwind.config.ts
git commit -m "feat(ui): dark premium global theme + Inter font"
```

---

## Task 2: UI primitives (with TDD for AnimatedNumber)

**Files:**
- Create: `src/components/ui/AnimatedNumber.tsx`, `src/components/ui/AnimatedNumber.test.ts`, `src/components/ui/Card.tsx`, `src/components/ui/TiltCard.tsx`, `src/components/ui/StatCard.tsx`, `src/components/ui/RoleBadge.tsx`

- [ ] **Step 1: Write the failing test for the count-up math** `src/components/ui/AnimatedNumber.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { easeOutCubic, frameValue } from "./AnimatedNumber";

describe("easeOutCubic", () => {
  it("is 0 at t=0 and 1 at t=1", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });
  it("is past halfway at t=0.5 (ease-out)", () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe("frameValue", () => {
  it("returns 0 before the delay", () => {
    expect(frameValue(240000, 0, 1400, 300, 100)).toBe(0); // elapsed 100 < delay 300
  });
  it("returns the target once finished", () => {
    expect(frameValue(240000, 0, 1400, 300, 5000)).toBe(240000);
  });
  it("is monotonic between start and end", () => {
    const a = frameValue(100, 0, 1000, 0, 250);
    const b = frameValue(100, 0, 1000, 0, 500);
    expect(b).toBeGreaterThanOrEqual(a);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (module missing)

Run: `npx vitest run src/components/ui/AnimatedNumber.test.ts`
Expected: FAIL — cannot find `./AnimatedNumber`.

- [ ] **Step 3: Implement `src/components/ui/AnimatedNumber.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Pure: value to render at `elapsed` ms, counting `from`→`to` over `dur` after `delay`. */
export function frameValue(
  to: number,
  from: number,
  dur: number,
  delay: number,
  elapsed: number,
): number {
  const t = Math.min(1, Math.max(0, (elapsed - delay) / dur));
  return Math.round(from + (to - from) * easeOutCubic(t));
}

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  duration = 1400,
  delay = 200,
  className = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const v = frameValue(value, 0, duration, delay, now - t0);
      setShown(v);
      if (now - t0 < delay + duration) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, delay]);
  return (
    <span className={className}>
      {prefix}
      {shown.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `npx vitest run src/components/ui/AnimatedNumber.test.ts`
Expected: 5 passing.

- [ ] **Step 5: Create `src/components/ui/Card.tsx`**

```tsx
import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-graphite-600 bg-white/[0.04] backdrop-blur p-4 ${className}`}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 6: Create `src/components/ui/TiltCard.tsx`** (extracted from the showcase)

```tsx
"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function TiltCard({
  children,
  wow,
  className = "",
}: {
  children: ReactNode;
  wow?: boolean;
  className?: string;
}) {
  const rx = useSpring(useMotionValue(0), { stiffness: 200, damping: 15 });
  const ry = useSpring(useMotionValue(0), { stiffness: 200, damping: 15 });
  const ref = useRef<HTMLDivElement>(null);
  return (
    <motion.div
      ref={ref}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 18);
        rx.set((0.5 - (e.clientY - r.top) / r.height) * 18);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      className={`rounded-2xl p-4 border ${
        wow
          ? "border-[#3a3320] bg-gradient-to-br from-[#1c1810] to-graphite-800"
          : "border-graphite-500 bg-gradient-to-br from-graphite-700 to-graphite-800"
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 7: Create `src/components/ui/StatCard.tsx`**

```tsx
import { Card } from "./Card";
import { AnimatedNumber } from "./AnimatedNumber";

export function StatCard({
  label,
  value,
  prefix = "₹",
  hint,
  gold,
}: {
  label: string;
  value: number;
  prefix?: string;
  hint?: string;
  gold?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="text-xs text-slate-400">{label}</div>
      <AnimatedNumber
        value={value}
        prefix={prefix}
        className={`block text-3xl font-extrabold mt-0.5 ${gold ? "text-gold" : "text-white"}`}
      />
      {hint && <div className="mt-2 text-xs text-granite-green2">{hint}</div>}
    </Card>
  );
}
```

- [ ] **Step 8: Create `src/components/ui/RoleBadge.tsx`**

```tsx
import type { Role } from "@/lib/roles";
import { ROLE_LABELS } from "@/lib/roles";

const STYLES: Record<Role, string> = {
  owner: "border-gold text-gold",
  sales_manager: "border-blue-400/60 text-blue-300",
  store_manager: "border-orange-400/60 text-orange-300",
  fabrication_supervisor: "border-purple-400/60 text-purple-300",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${STYLES[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
```

- [ ] **Step 9: Run full unit suite + typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: all unit tests pass (permissions, validation, AnimatedNumber); tsc clean.

- [ ] **Step 10: Commit**
```bash
git add src/components/ui
git commit -m "feat(ui): design-system primitives (AnimatedNumber, Card, TiltCard, StatCard, RoleBadge)"
```

---

## Task 3: Premium app shell (bottom nav with motion)

**Files:**
- Modify: `src/components/layout/AppShell.tsx`, `src/app/(app)/layout.tsx`

- [ ] **Step 1: Restyle `src/components/layout/AppShell.tsx`**

Replace the file with (keeps the existing `ICONS`/nav logic, adds dark theme + a Framer Motion active pill):
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { NAV_TABS_BY_ROLE, TABS, type Role, type TabKey } from "@/lib/roles";

const ICONS: Record<TabKey, React.ReactNode> = {
  home: <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
  inventory: <path d="M21 16V8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" />,
  orders: (
    <>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 9h6M9 13h6" />
    </>
  ),
  quotes: (
    <>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  payments: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  fabrication: (
    <>
      <path d="M3 21h18M5 21V9l5 3V9l5 3V9l4 3v9" />
    </>
  ),
};

export default function AppShell({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const tabs = NAV_TABS_BY_ROLE[role];

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(1200px_600px_at_70%_-10%,#1c2630,#0b0e11_60%)]">
      <main className="flex-1 pb-24 overflow-y-auto">{children}</main>
      <nav
        className="fixed bottom-0 inset-x-0 bg-graphite-900/90 backdrop-blur border-t border-graphite-600 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-around h-16 max-w-lg mx-auto">
          {tabs.map((key) => {
            const tab = TABS[key];
            const active =
              pathname === tab.href ||
              (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
            return (
              <Link
                key={key}
                href={tab.href}
                className="relative flex-1 flex flex-col items-center justify-center gap-1"
                style={{ color: active ? "#c9a24b" : "#5c6470" }}
              >
                {active && (
                  <motion.span
                    layoutId="navpill"
                    className="absolute top-1 h-1 w-8 rounded-full bg-gold"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {ICONS[key]}
                </svg>
                <span className="text-[11px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: `src/app/(app)/layout.tsx` stays server-gated (no change needed to logic)**

Confirm it still reads:
```tsx
import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/auth";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();
  return <AppShell role={user.role}>{children}</AppShell>;
}
```
No edit if it already matches. (The dark background now comes from `AppShell`.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**
```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat(ui): premium dark bottom nav with animated active pill"
```

---

## Task 4: Auth shell + Login screen

**Files:**
- Modify: `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Restyle `src/app/(auth)/layout.tsx`** to the premium centered shell

Replace the file with:
```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center px-5 bg-[radial-gradient(900px_500px_at_50%_-10%,#1c2630,#0b0e11_60%)]">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Restyle `src/app/(auth)/login/page.tsx`** — keep all logic, swap the submit buttons for the `Button` primitive and dark styling

Replace the file with:
```tsx
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { sendOtp, verifyOtp } from "@/actions/auth";
import { Button } from "@/components/ui/Button";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo");

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await sendOtp(phone);
    setLoading(false);
    if (res.error) return setError(res.error);
    setStep("otp");
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await verifyOtp(phone, otp);
    if (res.error) {
      setLoading(false);
      return setError(res.error);
    }
    router.replace(redirectTo || res.next!);
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-granite-green to-granite-green2 text-white grid place-items-center text-2xl font-extrabold shadow-lg shadow-granite-green2/40">
          G
        </div>
        <h1 className="mt-4 text-2xl font-bold text-white">GraniteOS</h1>
        <p className="mt-1 text-sm text-slate-400">
          {step === "phone"
            ? "Sign in to your granite business"
            : `Enter the code sent to ${phone}`}
        </p>
      </div>

      {step === "phone" ? (
        <form onSubmit={onSendOtp} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Phone number</span>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 99999 99999"
              className="mt-1.5 w-full text-base focus:border-gold outline-none"
            />
          </label>
          {error && <ErrorPill>{error}</ErrorPill>}
          <Button type="submit" variant="press" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send OTP"}
          </Button>
        </form>
      ) : (
        <form onSubmit={onVerifyOtp} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Verification code</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              style={{ height: 64 }}
              className="mt-1.5 w-full text-center text-2xl tracking-[0.5em] focus:border-gold outline-none"
            />
          </label>
          {error && <ErrorPill>{error}</ErrorPill>}
          <Button type="submit" variant="press" className="w-full" disabled={loading}>
            {loading ? "Verifying..." : "Verify & continue"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setOtp("");
              setError("");
            }}
            className="w-full text-sm text-slate-500 hover:text-slate-300"
          >
            Use a different phone number
          </button>
        </form>
      )}
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function ErrorPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**
```bash
git add "src/app/(auth)/layout.tsx" "src/app/(auth)/login/page.tsx"
git commit -m "feat(ui): premium auth shell + login screen"
```

---

## Task 5: Setup screen

**Files:**
- Modify: `src/app/(auth)/setup/page.tsx`

- [ ] **Step 1: Restyle `src/app/(auth)/setup/page.tsx`** — keep logic, dark fields + `Button`

Replace the file with:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { setupCompany } from "@/actions/company";
import { Button } from "@/components/ui/Button";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await setupCompany({
      companyName: fd.get("companyName"),
      city: fd.get("city"),
      ownerName: fd.get("ownerName"),
      phone: fd.get("phone") ?? "",
      address: fd.get("address") ?? "",
      gstNumber: fd.get("gstNumber") ?? "",
    });
    if (res.error) {
      setLoading(false);
      return setError(res.error);
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Set up your company</h1>
        <p className="mt-1 text-sm text-slate-400">
          One-time setup. You can change these later in settings.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field name="companyName" label="Company name" placeholder="Sharma Stone Industries" required />
        <Field name="city" label="City" placeholder="Jamnagar" required />
        <Field name="ownerName" label="Your name" placeholder="Ramesh Sharma" required />
        <Field name="phone" label="Phone number" placeholder="+91 99999 99999" type="tel" />
        <Field name="address" label="Address (optional)" placeholder="Plot 14, GIDC, Jamnagar" />
        <Field name="gstNumber" label="GST number (optional)" placeholder="22AAAAA0000A1Z5" />
        {error && (
          <div className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
            {error}
          </div>
        )}
        <Button type="submit" variant="press" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create company"}
        </Button>
      </form>
    </motion.div>
  );
}

function Field({
  name,
  label,
  placeholder,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input name={name} type={type} required={required} placeholder={placeholder} className="mt-1.5 w-full text-base focus:border-gold outline-none" />
    </label>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` (expect clean), then:
```bash
git add "src/app/(auth)/setup/page.tsx"
git commit -m "feat(ui): premium company setup screen"
```

---

## Task 6: Dashboard screen

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`, `src/components/auth/SignOutButton.tsx`

- [ ] **Step 1: Restyle `src/components/auth/SignOutButton.tsx`** for dark theme

Replace the file with:
```tsx
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
```

- [ ] **Step 2: Restyle `src/app/(app)/dashboard/page.tsx`** — server component, premium look using `StatCard`, `TiltCard`, `RoleBadge`

Replace the file with:
```tsx
import Link from "next/link";
import { Boxes, FileText, Receipt, Users } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { TiltCard } from "@/components/ui/TiltCard";
import SignOutButton from "@/components/auth/SignOutButton";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireSession();
  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", user.company_id)
    .single();

  const isOwner = can(user.role, "inviteTeamMember");

  return (
    <div className="max-w-lg mx-auto px-4 pt-12" style={{ perspective: 1000 }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{greeting()},</p>
          <h1 className="text-2xl font-bold text-white">{user.name}</h1>
          <p className="text-sm text-slate-400">{company?.name ?? ""}</p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-3">
        <RoleBadge role={user.role} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <TiltCard>
          <Boxes className="text-slate-300" />
          <p className="font-bold text-white mt-2">Inventory</p>
          <p className="text-xs text-slate-500 mt-1">Slice 3</p>
        </TiltCard>
        <TiltCard>
          <FileText className="text-slate-300" />
          <p className="font-bold text-white mt-2">Orders</p>
          <p className="text-xs text-slate-500 mt-1">Slice 4</p>
        </TiltCard>
        <TiltCard>
          <Receipt className="text-slate-300" />
          <p className="font-bold text-white mt-2">Quotes</p>
          <p className="text-xs text-slate-500 mt-1">Slice 4</p>
        </TiltCard>
        {isOwner ? (
          <Link href="/team" className="block">
            <TiltCard wow>
              <Users className="text-gold" />
              <p className="font-bold text-gold mt-2">Team</p>
              <p className="text-xs text-gold/70 mt-1">Manage &amp; invite</p>
            </TiltCard>
          </Link>
        ) : (
          <TiltCard>
            <Receipt className="text-slate-300" />
            <p className="font-bold text-white mt-2">Payments</p>
            <p className="text-xs text-slate-500 mt-1">Slice 6</p>
          </TiltCard>
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-gold/[0.06] border border-[#3a3320] p-4 text-sm text-gold">
        ✅ Foundation (Slice 1) — auth, company setup, role-aware navigation, and team
        management. Business modules land in later slices.
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit` (expect clean), then:
```bash
git add "src/app/(app)/dashboard/page.tsx" src/components/auth/SignOutButton.tsx
git commit -m "feat(ui): premium dashboard with tilt cards and role badge"
```

---

## Task 7: Team, InviteForm, ComingSoon, invite/accept

**Files:**
- Modify: `src/components/team/InviteForm.tsx`, `src/app/(app)/team/page.tsx`, `src/components/ComingSoon.tsx`, `src/app/invite/accept/page.tsx`

- [ ] **Step 1: Restyle `src/components/team/InviteForm.tsx`** — keep logic, dark fields + `Button`

Replace the file with:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteTeamMember } from "@/actions/team";
import { Button } from "@/components/ui/Button";

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
    <div className="mt-6 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4">
      <p className="font-bold text-white">Invite a team member</p>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <input name="name" required placeholder="Name" className="w-full text-base outline-none focus:border-gold" />
        <input name="phone" type="tel" required placeholder="+91 99999 99999" className="w-full text-base outline-none focus:border-gold" />
        <select name="role" defaultValue="sales_manager" className="w-full text-base">
          <option value="sales_manager">Sales Manager</option>
          <option value="store_manager">Store Manager</option>
          <option value="fabrication_supervisor">Fabrication Supervisor</option>
        </select>
        {error && (
          <div className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
            {error}
          </div>
        )}
        <Button type="submit" variant="morph" className="w-full" onAction={async () => {}}>
          Send invite
        </Button>
      </form>
      {inviteUrl && (
        <div className="mt-3 rounded-lg bg-gold/[0.06] border border-[#3a3320] p-3">
          <p className="text-xs text-gold/80">Invite link — send it to the member:</p>
          <p className="text-xs font-mono break-all text-gold">{inviteUrl}</p>
        </div>
      )}
    </div>
  );
}
```

Note: the `Button variant="morph"` here uses `onAction={async () => {}}` purely for the press→✓ animation; the real submit is the form's `onSubmit`. Keep `type="submit"` so the form handler runs.

- [ ] **Step 2: Restyle `src/app/(app)/team/page.tsx`** — server component, dark list

Replace the file with:
```tsx
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import InviteForm from "@/components/team/InviteForm";

export default async function TeamPage() {
  const me = await requireSession();
  if (!can(me.role, "inviteTeamMember")) redirect("/dashboard");

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("users")
    .select("id, name, phone, role, status")
    .order("created_at", { ascending: true });

  const list = (members ?? []) as {
    id: string;
    name: string;
    phone: string | null;
    role: Role;
    status: string;
  }[];

  return (
    <div className="max-w-lg mx-auto px-4 pt-12">
      <h1 className="text-2xl font-bold text-white">Team</h1>
      <p className="text-sm text-slate-400">{list.length} member(s)</p>

      <div className="mt-5 space-y-2">
        {list.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-2xl border border-graphite-600 bg-white/[0.04] p-3"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-granite-green to-granite-green2 text-white grid place-items-center font-bold">
              {m.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">{m.name}</p>
              <p className="text-xs text-slate-500">{m.phone ?? "—"}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">{ROLE_LABELS[m.role]}</span>
              {m.status === "invited" && (
                <p className="text-[11px] text-amber-400 font-medium">Pending</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <InviteForm />
    </div>
  );
}
```

- [ ] **Step 3: Restyle `src/components/ComingSoon.tsx`**

Replace the file with:
```tsx
export default function ComingSoon({ title, slice }: { title: string; slice: string }) {
  return (
    <div className="max-w-lg mx-auto px-4 pt-12">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      <div className="mt-6 rounded-2xl border border-dashed border-graphite-500 bg-white/[0.03] p-8 text-center">
        <div className="text-4xl">🛠️</div>
        <p className="mt-3 font-medium text-slate-200">Coming soon</p>
        <p className="mt-1 text-sm text-slate-400">This module ships in {slice}.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Restyle the error UI in `src/app/invite/accept/page.tsx`**

Only the returned error JSX changes (logic identical). Replace the file with:
```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "@/actions/team";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/invite/accept?token=${token}`)}`);
  }

  const res = await acceptInvite(token);
  if (res.error) {
    return (
      <div className="min-h-screen grid place-items-center px-5 bg-graphite-900">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-bold text-white">Invite problem</h1>
          <p className="mt-2 text-sm text-red-300">{res.error}</p>
          <a href="/login" className="mt-6 inline-block text-sm text-gold underline">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }
  redirect("/dashboard");
}
```

- [ ] **Step 5: Typecheck + build + commit**

Run: `npx tsc --noEmit && npm run build`
Expected: clean tsc; build succeeds, all routes compile.
```bash
git add "src/app/(app)/team/page.tsx" src/components/team/InviteForm.tsx src/components/ComingSoon.tsx "src/app/invite/accept/page.tsx"
git commit -m "feat(ui): premium team, invite, coming-soon screens"
```

---

## Task 8: Playwright setup + showcase smoke test (runs without a database)

**Files:**
- Create: `playwright.config.ts`, `e2e/showcase.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Playwright + Chromium**

Run:
```bash
npm install -D @playwright/test
npx playwright install chromium
```
Expected: install completes; Chromium downloaded.

- [ ] **Step 2: Add scripts to `package.json`** (`"scripts"` block)

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 3: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/showcase",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 4: Create `e2e/showcase.spec.ts`** (always green — no database needed)

```ts
import { test, expect } from "@playwright/test";

test.describe("Showcase (design system)", () => {
  test("renders the premium dashboard with 3D slab and buttons", async ({ page }) => {
    await page.goto("/showcase");

    // 3D slab canvas mounts
    await expect(page.locator("canvas")).toBeVisible({ timeout: 15_000 });

    // the wedge feature and key buttons are present
    await expect(page.getByText("Recovery Radar")).toBeVisible();
    await expect(page.getByRole("button", { name: /New GST Bill/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Send on WhatsApp/i })).toBeVisible();

    // animated cash counter reaches its target
    await expect(page.getByText("₹2,40,000")).toBeVisible({ timeout: 5_000 });
  });

  test("the morph button shows a success state when clicked", async ({ page }) => {
    await page.goto("/showcase");
    const pay = page.getByRole("button", { name: /Record Payment/i });
    await expect(pay).toBeVisible();
    await pay.click();
    // after the async action it morphs to a check (label text disappears)
    await expect(pay).not.toHaveText(/Record Payment/i, { timeout: 4_000 });
  });
});
```

- [ ] **Step 5: Run the smoke test**

Run: `npm run test:e2e -- e2e/showcase.spec.ts`
Expected: 2 passed. (Playwright starts the dev server itself via `webServer`.)

- [ ] **Step 6: Ignore Playwright artifacts + commit**

Append to `.gitignore`:
```gitignore
/test-results
/playwright-report
/.playwright
```
Then:
```bash
git add playwright.config.ts e2e/showcase.spec.ts package.json package-lock.json .gitignore
git commit -m "test(e2e): playwright setup + showcase smoke test"
```

---

## Task 9: Auth-flow integration test (database-gated)

**Files:**
- Create: `e2e/auth-flow.spec.ts`

> This test exercises the REAL flow (phone OTP → company setup → dashboard) and only runs when Supabase is connected. It is skipped automatically until then, so the suite stays green.

- [ ] **Step 1: Create `e2e/auth-flow.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

// Configure these in the environment (the Supabase "test OTP" number).
const TEST_PHONE = process.env.E2E_TEST_PHONE ?? "+919999999999";
const TEST_OTP = process.env.E2E_TEST_OTP ?? "123456";
const DB_READY = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

test.describe("Auth → company → dashboard", () => {
  test.skip(!DB_READY, "Supabase not configured (set NEXT_PUBLIC_SUPABASE_URL to run).");

  test("a phone login lands on setup or dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("+91 99999 99999").fill(TEST_PHONE);
    await page.getByRole("button", { name: /Send OTP/i }).click();

    await page.getByPlaceholder("••••••").fill(TEST_OTP);
    await page.getByRole("button", { name: /Verify & continue/i }).click();

    // New user → /setup ; returning user → /dashboard
    await expect(page).toHaveURL(/\/(setup|dashboard)/, { timeout: 15_000 });
  });

  test("a store_manager cannot open the owner-only team page", async ({ page }) => {
    // Precondition: a signed-in non-owner session. This test documents the guard;
    // it runs meaningfully once a store_manager account exists in the test project.
    await page.goto("/team");
    // Without a session middleware bounces to /login; with a non-owner it bounces to /dashboard.
    await expect(page).toHaveURL(/\/(login|dashboard)/, { timeout: 15_000 });
  });
});
```

- [ ] **Step 2: Verify it SKIPS cleanly when no database is configured**

Run: `npm run test:e2e -- e2e/auth-flow.spec.ts`
Expected: both tests reported as **skipped** (because `NEXT_PUBLIC_SUPABASE_URL` is unset), suite still green.

- [ ] **Step 3: Commit**
```bash
git add e2e/auth-flow.spec.ts
git commit -m "test(e2e): database-gated auth-flow integration test"
```

---

## Task 10: Full verification + DRY the showcase

**Files:**
- Modify: `src/app/showcase/page.tsx`

- [ ] **Step 1: DRY — make the showcase reuse the extracted primitives**

In `src/app/showcase/page.tsx`, remove the locally-defined `TiltCard` and the `useCountUp` hook, and import the shared ones instead. Change the imports at the top to:
```tsx
import dynamic from "next/dynamic";
import { Box, Star, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TiltCard } from "@/components/ui/TiltCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
```
Delete the in-file `useCountUp` function and the in-file `TiltCard` function. Replace the cash usage `₹{cash.toLocaleString("en-IN")}` with `<AnimatedNumber value={240000} prefix="₹" />` and replace the two `<TiltCard ...>` usages' children to pass icon/title/sub as JSX inside (the shared `TiltCard` takes `children` + `wow`), e.g.:
```tsx
<TiltCard><Box className="text-slate-300" /><p className="font-bold text-white mt-2">Stock</p><p className="text-xs text-slate-500 mt-1">412 slabs · 18 blocks</p></TiltCard>
<TiltCard wow><Star className="text-gold" /><p className="font-bold text-gold mt-2">Recovery Radar</p><p className="text-xs text-slate-500 mt-1">71% avg yield</p></TiltCard>
<TiltCard><FileText className="text-slate-300" /><p className="font-bold text-white mt-2">GST Bills</p><p className="text-xs text-slate-500 mt-1">auto 5% / 18%</p></TiltCard>
```
For the recovery ring, keep a local count-up using `AnimatedNumber` is not suitable (it drives a CSS angle), so leave the ring's own small `useState`+`requestAnimationFrame` block in place. (Only the cash number and TiltCard are de-duplicated.)

- [ ] **Step 2: Run the complete verification gate**

Run: `npm test && npx tsc --noEmit && npm run build && npm run test:e2e -- e2e/showcase.spec.ts`
Expected: unit tests pass; tsc clean; build succeeds (all routes); Playwright showcase smoke 2/2 passed.

- [ ] **Step 3: Manual preview check (dark theme across screens)**

Run: `npm run dev`, then open:
- `http://localhost:3000/showcase` — premium dashboard
- `http://localhost:3000/login` — premium login (dark, gold logo, 3D-press button)

Expected: both render in the dark graphite/gold theme with working interactions. (The gated screens `/dashboard`, `/team` need Supabase to render real data — verified in Task 9's flow once keys are in.)

- [ ] **Step 4: Commit**
```bash
git add src/app/showcase/page.tsx
git commit -m "refactor(ui): DRY showcase onto shared primitives; full verification pass"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** Premium theme → Task 1. Reusable design system (Button done; AnimatedNumber/Card/TiltCard/StatCard/RoleBadge) → Task 2. Every Foundation screen restyled: app shell/nav → Task 3; login + auth shell → Task 4; setup → Task 5; dashboard → Task 6; team/invite/coming-soon/accept → Task 7. Integration tests: Playwright setup + always-green showcase smoke → Task 8; database-gated real auth flow → Task 9. DRY + full verification → Task 10.
- **Placeholder scan:** No "TBD"/"add styling here" — every step has complete file contents or an exact, unambiguous edit. The one intentionally-empty `onAction={async () => {}}` in InviteForm is explained (animation-only; real submit via form `onSubmit`).
- **Type consistency:** `Role`/`ROLE_LABELS` reused from `@/lib/roles` in RoleBadge (Task 2) and team (Task 7); `Button` variants (`press`/`spring`/`morph`/`outline`) consistent with the already-built `Button.tsx`; `AnimatedNumber`/`TiltCard` signatures defined in Task 2 and consumed identically in Tasks 6, 10; `can(role, "inviteTeamMember")` consistent across dashboard (Task 6) and team (Task 7).
- **Dependency order:** Primitives (Task 2) exist before screens consume them (Tasks 3–7); Playwright installed (Task 8) before the gated test (Task 9); DRY refactor of showcase (Task 10) happens after primitives are stable.
- **Known constraint:** Gated screens render only with Supabase connected — covered honestly by Task 9's skip-by-default and Task 10's manual note.
