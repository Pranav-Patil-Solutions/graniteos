"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setupCompany } from "@/actions/company";

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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Set up your company</h1>
        <p className="mt-1 text-sm text-slate-500">
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
          <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-100">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-granite-green text-white font-semibold text-base disabled:opacity-60 hover:opacity-95 transition"
        >
          {loading ? "Creating..." : "Create company"}
        </button>
      </form>
    </div>
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
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 text-base focus:border-granite-green focus:ring-2 focus:ring-granite-green/20 outline-none"
      />
    </label>
  );
}
