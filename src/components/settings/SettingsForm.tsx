"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCompany } from "@/actions/company";
import { Button } from "@/components/ui/Button";
import { validateGstin, parseStateFromGstin, stateName, GST_STATES } from "@/lib/gst";

type Company = {
  name: string;
  legal_name: string | null;
  city: string | null;
  gst_number: string | null;
  gst_state_code: string | null;
  pan: string | null;
  upi_id: string | null;
  quote_terms_text: string | null;
};

export default function SettingsForm({ company }: { company: Company }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [gstin, setGstin] = useState(company.gst_number ?? "");
  const [stateCode, setStateCode] = useState(
    company.gst_state_code ?? parseStateFromGstin(company.gst_number) ?? "",
  );
  const gstCheck = gstin ? validateGstin(gstin) : null;

  function onGstin(v: string) {
    const up = v.toUpperCase();
    setGstin(up);
    const sc = parseStateFromGstin(up);
    if (sc) setStateCode(sc);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await updateCompany({
      name: fd.get("name"),
      legalName: fd.get("legalName") ?? "",
      city: fd.get("city") ?? "",
      gstNumber: gstin,
      gstStateCode: stateCode,
      pan: fd.get("pan") ?? "",
      upiId: fd.get("upiId") ?? "",
      quoteTerms: fd.get("quoteTerms") ?? "",
    });
    setLoading(false);
    if ("error" in res) return setError(res.error ?? '');
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field name="name" label="Trade name (display)" defaultValue={company.name} required />
      <Field
        name="legalName"
        label="Legal / registered name (on tax invoice)"
        defaultValue={company.legal_name ?? ""}
        placeholder="Shree Stone Industries Pvt Ltd"
      />
      <Field name="city" label="City" defaultValue={company.city ?? ""} />

      <label className="block">
        <span className="text-xs font-medium text-slate-300">GSTIN</span>
        <input
          suppressHydrationWarning
          value={gstin}
          onChange={(e) => onGstin(e.target.value)}
          placeholder="27ABCDE1234F1Z0"
          maxLength={15}
          className="mt-1 w-full text-base focus:border-gold outline-none font-mono tracking-wide"
        />
        {gstCheck && (
          <span className={`text-xs ${gstCheck.valid ? "text-granite-green2" : "text-red-300"}`}>
            {gstCheck.valid
              ? `✓ Valid · ${stateName(stateCode)} (${stateCode})`
              : `✗ ${gstCheck.reason}`}
          </span>
        )}
      </label>

      <label className="block">
        <span className="text-xs font-medium text-slate-300">GST state (place of business)</span>
        <select
          suppressHydrationWarning
          value={stateCode}
          onChange={(e) => setStateCode(e.target.value)}
          className="mt-1 w-full text-base focus:border-gold outline-none"
        >
          <option value="">Select state…</option>
          {GST_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </label>

      <Field name="pan" label="PAN" defaultValue={company.pan ?? ""} placeholder="ABCDE1234F" />
      <Field
        name="upiId"
        label="UPI ID (for pay-links)"
        defaultValue={company.upi_id ?? ""}
        placeholder="yourname@okhdfcbank"
      />
      <label className="block">
        <span className="text-xs font-medium text-slate-300">Default quote/invoice terms</span>
        <input
          suppressHydrationWarning
          name="quoteTerms"
          defaultValue={company.quote_terms_text ?? ""}
          placeholder="50% advance, balance before dispatch"
          className="mt-1 w-full text-base focus:border-gold outline-none"
        />
      </label>
      {error && (
        <div className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
          {error}
        </div>
      )}
      {saved && <div className="text-sm text-granite-green2">✓ Saved</div>}
      <Button type="submit" variant="press" className="w-full" disabled={loading}>
        {loading ? "Saving..." : "Save settings"}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      <input
        suppressHydrationWarning
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full text-base focus:border-gold outline-none"
      />
    </label>
  );
}
