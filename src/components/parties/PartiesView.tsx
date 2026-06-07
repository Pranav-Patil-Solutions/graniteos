"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Phone, MapPin } from "lucide-react";
import { addParty } from "@/actions/parties";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatINR } from "@/lib/money";
import { CUSTOMER_TYPES, SUPPLIER_TYPES } from "@/lib/validation";

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
}: {
  parties: Party[];
  initialKind: Kind;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>(initialKind);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      city: fd.get("city") ?? "",
      gstin: fd.get("gstin") ?? "",
      email: fd.get("email") ?? "",
      creditLimitRupees: fd.get("creditLimitRupees") || undefined,
      openingBalanceRupees: fd.get("openingBalanceRupees") || undefined,
      notes: fd.get("notes") ?? "",
    });
    setLoading(false);
    if (res.error) return setError(res.error);
    (e.target as HTMLFormElement).reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <h1 className="text-2xl font-bold text-white">Parties</h1>
      <p className="text-sm text-slate-400">Who you sell to &amp; buy from</p>

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
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-graphite-500 text-slate-300 py-3.5 hover:border-gold hover:text-gold transition-colors"
          >
            <Plus className="w-4 h-4" /> Add {kind === "customer" ? "customer" : "supplier"}
          </button>
        ) : (
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
              <Field name="gstin" label="GSTIN (opt.)" placeholder="36ABCDE1234F1Z5" />
            </div>
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
        )}
      </div>

      {/* list */}
      <div className="mt-4 space-y-2">
        {list.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-6">
            No {kind === "customer" ? "customers" : "suppliers"} yet — add one above.
          </p>
        )}
        {list.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-2xl border border-graphite-600 bg-white/[0.04] p-3"
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
          </div>
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
