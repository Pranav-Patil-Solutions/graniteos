# GraniteOS

A **multi-tenant SaaS ERP for the granite & marble trade** — the full back office for a stone business, from slab inventory to GST invoicing, built for India-first workflows with an AI studio on top.

## Features

- **Inventory & catalog** — slab/product stock, low-stock alerts, public catalog & shareable slab pages.
- **Sales flow** — quotes → orders → GST invoices, with measure, fabrication, and factory workflows.
- **Money** — daybook, payments, batch & vendor payments, purchase orders, ExcelJS exports.
- **AI Studio** — content and assist features powered by Groq (`@ai-sdk/groq`) and Google Gemini (`@google/genai`).
- **Analytics** — Recharts dashboards across sales, stock, and growth.
- **Multi-tenant & secure** — Supabase Postgres with Row-Level Security, phone-OTP + MFA auth, and role-based access control.

## Stack

Next.js (App Router) · React · TypeScript · Supabase (Postgres + RLS + SSR) · Vercel AI SDK (Groq + Gemini) · ExcelJS · Recharts · Three.js · Framer Motion · Zod · Playwright + Vitest

## Run it

```bash
npm install
cp .env.example .env.local     # add Supabase + AI provider keys
npm run migrate:up             # apply DB migrations
npm run dev                    # http://localhost:3000
```

```bash
npm run build && npm start     # production
npm test                       # unit (vitest)
npm run test:e2e               # end-to-end (playwright)
npm run migrate:status         # migration state
```

## Structure

```
src/app/(app)/     authenticated app — inventory, quotes, orders, invoices, money, ai-studio, analytics…
src/app/(auth)/    login, MFA, setup (phone-OTP + RBAC)
src/app/catalog/   public catalog & shareable slab pages
supabase/          schema, migrations (RLS policies)
e2e/               Playwright end-to-end tests
docs/              runbooks: go-live, backup/recovery, incident response
```

> Ships with a certification-readiness audit covering DPDP/GDPR, OWASP/AppSec, Supabase-RLS, and WCAG — see `CERTIFICATION-READINESS-REPORT.md`.
