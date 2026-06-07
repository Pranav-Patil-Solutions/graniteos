"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCompany } from "@/actions/company";
import { Button } from "@/components/ui/Button";

type Company = {
  name: string;
  city: string | null;
  gst_number: string | null;
  upi_id: string | null;
  quote_terms_text: string | null;
};

export default function SettingsForm({ company }: { company: Company }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await updateCompany({
      name: fd.get("name"),
      city: fd.get("city") ?? "",
      gstNumber: fd.get("gstNumber") ?? "",
      upiId: fd.get("upiId") ?? "",
      quoteTerms: fd.get("quoteTerms") ?? "",
    });
    setLoading(false);
    if (res.error) return setError(res.error);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field name="name" label="Company name" defaultValue={company.name} required />
      <Field name="city" label="City" defaultValue={company.city ?? ""} />
      <Field name="gstNumber" label="GST number" defaultValue={company.gst_number ?? ""} placeholder="36ABCDE1234F1Z5" />
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
