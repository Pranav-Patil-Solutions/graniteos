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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
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
      <input
        suppressHydrationWarning
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 w-full text-base focus:border-gold outline-none"
      />
    </label>
  );
}
