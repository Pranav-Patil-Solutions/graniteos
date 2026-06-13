"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAccessControl } from "@/actions/access-control";
import { Button } from "@/components/ui/Button";
import {
  ACCESS_MODULES,
  MODULE_LABELS,
  DEFAULT_CONFIG,
  type AccessConfig,
  type AccessLevel,
  type NonOwnerRole,
} from "@/lib/access-control";

const NON_OWNER_ROLES: { key: NonOwnerRole; label: string }[] = [
  { key: "sales_manager",        label: "Sales Manager" },
  { key: "store_manager",        label: "Store Manager" },
  { key: "fabrication_supervisor", label: "Fab. Supervisor" },
];

const LEVEL_OPTIONS: { value: AccessLevel; label: string }[] = [
  { value: "none", label: "— No access" },
  { value: "view", label: "View" },
  { value: "edit", label: "Edit" },
];

function getLevel(
  config: AccessConfig,
  role: NonOwnerRole,
  mod: (typeof ACCESS_MODULES)[number],
): AccessLevel {
  const stored = config?.[role]?.[mod];
  if (stored === "none" || stored === "view" || stored === "edit") return stored;
  return DEFAULT_CONFIG[role]?.[mod] ?? "none";
}

export default function AccessControlGrid({
  initialConfig,
}: {
  initialConfig: AccessConfig;
}) {
  const router = useRouter();
  const [config, setConfig] = useState<AccessConfig>(() => {
    // Ensure all roles + modules have a value (fill gaps from DEFAULT_CONFIG).
    const filled: AccessConfig = {};
    for (const { key: role } of NON_OWNER_ROLES) {
      const roleConfig: Record<string, AccessLevel> = {};
      for (const mod of ACCESS_MODULES) {
        roleConfig[mod] = getLevel(initialConfig, role, mod);
      }
      filled[role] = roleConfig as AccessConfig[typeof role];
    }
    return filled;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function setLevel(role: NonOwnerRole, mod: (typeof ACCESS_MODULES)[number], level: AccessLevel) {
    setConfig((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] ?? {}),
        [mod]: level,
      },
    }));
    setSaved(false);
  }

  async function onSave() {
    setLoading(true);
    setError("");
    setSaved(false);
    const res = await saveAccessControl(config);
    setLoading(false);
    if ("error" in res) {
      setError(res.error ?? '');
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Owner always has full edit access. Configure what each non-owner role can do.
      </p>

      {/* Horizontal scroll wrapper for mobile */}
      <div className="overflow-x-auto rounded-2xl border border-graphite-600 bg-white/[0.04]">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-graphite-600">
              <th className="px-4 py-3 text-left text-slate-400 font-medium w-44">Module</th>
              {NON_OWNER_ROLES.map((r) => (
                <th key={r.key} className="px-3 py-3 text-center text-slate-300 font-semibold">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ACCESS_MODULES.map((mod, idx) => (
              <tr
                key={mod}
                className={
                  idx % 2 === 0
                    ? "border-b border-graphite-600/50"
                    : "border-b border-graphite-600/30 bg-white/[0.02]"
                }
              >
                <td className="px-4 py-2.5 text-white font-medium">
                  {MODULE_LABELS[mod]}
                </td>
                {NON_OWNER_ROLES.map((r) => {
                  const current = getLevel(config, r.key, mod);
                  return (
                    <td key={r.key} className="px-3 py-2 text-center">
                      <select
                        suppressHydrationWarning
                        value={current}
                        onChange={(e) => setLevel(r.key, mod, e.target.value as AccessLevel)}
                        className={`text-xs rounded-lg px-2 py-1 border outline-none focus:border-gold w-full text-center ${
                          current === "edit"
                            ? "bg-granite-green2/15 border-granite-green2/40 text-granite-green2"
                            : current === "view"
                            ? "bg-blue-500/15 border-blue-500/30 text-blue-300"
                            : "bg-graphite-600/30 border-graphite-600 text-slate-500"
                        }`}
                      >
                        {LEVEL_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
          {error}
        </div>
      )}
      {saved && (
        <div className="text-sm text-granite-green2">Access control saved.</div>
      )}

      <Button variant="press" onClick={onSave} disabled={loading} className="w-full sm:w-auto">
        {loading ? "Saving…" : "Save access control"}
      </Button>
    </div>
  );
}
