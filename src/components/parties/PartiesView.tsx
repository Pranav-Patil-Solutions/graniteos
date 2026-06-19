"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Phone, MapPin, BadgeCheck, ChevronRight, Eye, Users } from "lucide-react";
import { addParty } from "@/actions/parties";
import { verifyGstin } from "@/actions/gst";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatINR } from "@/lib/money";
import { CUSTOMER_TYPES, SUPPLIER_TYPES } from "@/lib/validation";
import { validateGstin, parseStateFromGstin, stateName } from "@/lib/gst";

type Kind = "customer" | "supplier";
type Party = {
  id: string;
  kind: Kind;
  name: string;
  party_type: string | null;
  phone: string | null;
  city: string | null;
  gstin: string | null;
  credit_limit_paise: number;
  opening_balance_paise: number;
};

export default function PartiesView({
  parties,
  initialKind,
  viewOnly = false,
}: {
  parties: Party[];
  initialKind: Kind;
  viewOnly?: boolean;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>(initialKind);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // GSTIN: live format/checksum + best-effort verify (autofills when a GSP is wired)
  const [gstin, setGstin] = useState("");
  const [gstMsg, setGstMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [autoCity, setAutoCity] = useState("");
  const gstStateCode = parseStateFromGstin(gstin) ?? "";

  function onGstin(v: string) {
    const up = v.toUpperCase();
    setGstin(up);
    if (!up) return setGstMsg(null);
    const r = validateGstin(up);
    setGstMsg(
      r.valid
        ? { ok: true, text: `✓ Valid · ${stateName(up.slice(0, 2))} (${up.slice(0, 2)})` }
        : { ok: false, text: `✗ ${r.reason}` },
    );
  }

  async function onVerify() {
    if (!gstin) return;
    setVerifying(true);
    const res = await verifyGstin(gstin);
    setVerifying(false);
    if ("error" in res) return setGstMsg({ ok: false, text: res.error });
    if (!res.valid) return setGstMsg({ ok: false, text: res.reason ?? "Invalid GSTIN" });
    const rec = res.record;
    if (rec.legalName) setLegalName(rec.legalName);
    if (rec.city) setAutoCity(rec.city);
    setGstMsg({
      ok: true,
      text: rec.liveLookup
        ? `✓ ${rec.status.toUpperCase()} · ${rec.legalName ?? ""}`
        : `✓ Format valid — live GST-portal lookup activates once a verification provider is connected`,
    });
  }

  function resetGst() {
    setGstin("");
    setGstMsg(null);
    setLegalName("");
    setAutoCity("");
  }

  const list = parties.filter((p) => p.kind === kind);
  const totalOutstanding = list.reduce((n, p) => n + Number(p.opening_balance_paise), 0);
  const types = kind === "customer" ? CUSTOMER_TYPES : SUPPLIER_TYPES;
  const balanceLabel = kind === "customer" ? "they owe you" : "you owe them";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await addParty({
      kind,
      name: fd.get("name"),
      partyType: fd.get("partyType") ?? "",
      phone: fd.get("phone") ?? "",
      city: (fd.get("city") as string) || autoCity || "",
      address: fd.get("address") ?? "",
      gstin,
      gstStateCode,
      legalName,
      email: fd.get("email") ?? "",
      creditLimitRupees: fd.get("creditLimitRupees") || undefined,
      openingBalanceRupees: fd.get("openingBalanceRupees") || undefined,
      notes: fd.get("notes") ?? "",
    });
    setLoading(false);
    if ("error" in res) return setError(res.error ?? '');
    (e.target as HTMLFormElement).reset();
    resetGst();
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-12 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Parties</h1>
          <p className="text-sm text-slate-400">Who you sell to &amp; buy from</p>
        </div>
        {viewOnly && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/15 text-blue-300 px-3 py-1.5 text-xs font-semibold border border-blue-500/20">
            <Eye className="w-3.5 h-3.5" /> View only
          </span>
        )}
      </div>
      {viewOnly && (
        <p className="mt-1 text-xs text-blue-300/70">
          You have read-only access. Ask the owner to enable editing for your role.
        </p>
      )}

      {/* tabs */}
      <div className="mt-4 grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/[0.04] border border-graphite-600">
        {(["customer", "supplier"] as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => {
              setKind(k);
              setOpen(false);
              setError("");
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              kind === k ? "bg-gold/15 text-gold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {k === "customer" ? "Customers" : "Suppliers"}
          </button>
        ))}
      </div>

      {/* summary */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="p-3 text-center">
          <span className="block text-2xl font-extrabold text-white">{list.length}</span>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {kind === "customer" ? "customers" : "suppliers"}
          </div>
        </Card>
        <Card className="p-3 text-center">
          <span className="block text-2xl font-extrabold text-gold">{formatINR(totalOutstanding)}</span>
          <div className="text-[11px] text-slate-400 mt-0.5">{balanceLabel}</div>
        </Card>
      </div>

      {/* add */}
      <div className="mt-4">
        {!open && !viewOnly ? (
          <button
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-graphite-500 text-slate-300 py-3.5 hover:border-gold hover:text-gold transition-colors"
          >
            <Plus className="w-4 h-4" /> Add {kind === "customer" ? "customer" : "supplier"}
          </button>
        ) : open ? (
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-graphite-600 bg-white/[0.04] p-4 space-y-3"
          >
            <p className="font-bold text-white">
              New {kind === "customer" ? "customer" : "supplier"}
            </p>
            <Field name="name" label="Name" placeholder="Verma Builders" required />
            <div className="grid grid-cols-2 gap-3">
              <Select name="partyType" label="Type">
                <option value="">—</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
              <Field name="city" label="City" placeholder="Hyderabad" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field name="phone" label="Phone" placeholder="+91 98xxxxxxx" />
              <Field name="email" label="Email" placeholder="name@firm.com" />
            </div>

            <label className="block">
              <span className="text-xs font-medium text-slate-300">GSTIN / business ID (optional)</span>
              <div className="mt-1 flex gap-2">
                <input
                  suppressHydrationWarning
                  value={gstin}
                  onChange={(e) => onGstin(e.target.value)}
                  maxLength={15}
                  placeholder="36ABCDE1234F1Z5"
                  className="flex-1 text-base font-mono tracking-wide focus:border-gold outline-none"
                />
                <button
                  type="button"
                  onClick={onVerify}
                  disabled={verifying || !gstin}
                  className="inline-flex items-center gap-1 rounded-lg border border-graphite-500 px-3 text-sm text-slate-300 hover:border-gold hover:text-gold disabled:opacity-40"
                >
                  <BadgeCheck className="w-4 h-4" /> {verifying ? "…" : "Verify"}
                </button>
              </div>
              {gstMsg && (
                <span className={`text-xs ${gstMsg.ok ? "text-granite-green2" : "text-red-300"}`}>
                  {gstMsg.text}
                </span>
              )}
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-300">Owner / legal name</span>
              <input
                suppressHydrationWarning
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Proprietor or registered name"
                className="mt-1 w-full text-base focus:border-gold outline-none"
              />
              <span className="text-[11px] text-slate-500">Auto-fills from GSTIN verify — or type it in.</span>
            </label>
            <Field name="address" label="Address" placeholder="Shop / street, area" />

            <div className="grid grid-cols-2 gap-3">
              <Field
                name="openingBalanceRupees"
                label={`Outstanding ₹ (${balanceLabel})`}
                placeholder="0"
                num
              />
              {kind === "customer" && (
                <Field name="creditLimitRupees" label="Credit limit ₹" placeholder="500000" num />
              )}
            </div>

            <label className="block">
              <span className="text-xs font-medium text-slate-300">Notes</span>
              <textarea
                suppressHydrationWarning
                name="notes"
                rows={2}
                placeholder="Anything to remember about this party…"
                className="mt-1 w-full text-base focus:border-gold outline-none resize-none"
              />
            </label>
            {error && (
              <div className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" variant="press" className="flex-1" disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 text-sm text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {/* list */}
      <div className="mt-4 space-y-2">
        {list.length === 0 && (
          <EmptyState
            heading={kind === "customer" ? "No customers yet" : "No suppliers yet"}
            subtext={
              kind === "customer"
                ? "Customers are your buyers — builders, architects, dealers. Add them here or import from Excel."
                : "Suppliers are your quarries, block vendors and processors. Add them here or import from Excel."
            }
            actionLabel={`Import ${kind === "customer" ? "customers" : "suppliers"} from Excel`}
            actionHref="/import"
            icon={<Users className="w-10 h-10" />}
          />
        )}
        {list.map((p) => (
          <Link
            key={p.id}
            href={`/parties/${p.id}`}
            className="flex items-center gap-3 rounded-2xl border border-graphite-600 bg-white/[0.04] p-3 hover:border-gold/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-granite-green to-granite-green2 text-white grid place-items-center font-bold shrink-0">
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{p.name}</p>
              <p className="text-xs text-slate-400 truncate flex items-center gap-2">
                {p.party_type && <span>{p.party_type}</span>}
                {p.city && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {p.city}
                  </span>
                )}
                {p.phone && (
                  <span className="flex items-center gap-0.5">
                    <Phone className="w-3 h-3" />
                    {p.phone}
                  </span>
                )}
              </p>
            </div>
            {Number(p.opening_balance_paise) > 0 && (
              <div className="text-right shrink-0">
                <div
                  className={`text-sm font-bold ${kind === "customer" ? "text-red-300" : "text-amber-300"}`}
                >
                  {formatINR(p.opening_balance_paise)}
                </div>
                <div className="text-[10px] text-slate-500">{balanceLabel}</div>
              </div>
            )}
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  placeholder,
  required,
  num,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  num?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      <input
        suppressHydrationWarning
        name={name}
        type={num ? "number" : "text"}
        inputMode={num ? "decimal" : undefined}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full text-base focus:border-gold outline-none"
      />
    </label>
  );
}

function Select({
  name,
  label,
  children,
}: {
  name: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      <select
        suppressHydrationWarning
        name={name}
        defaultValue=""
        className="mt-1 w-full text-base focus:border-gold outline-none"
      >
        {children}
      </select>
    </label>
  );
}
