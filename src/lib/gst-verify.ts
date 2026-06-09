/**
 * Pluggable GSTIN verification. Phase A ships a Noop provider that only does
 * local format + check-digit validation. A real GSP/ASP provider (ClearTax,
 * Masters India, Surepass, Signzy…) can be wired later via env vars without
 * touching callers — they all implement GstVerifyProvider.
 */
import { validateGstin, parseStateFromGstin, stateName } from "./gst";

export type GstinStatus = "active" | "cancelled" | "suspended" | "unverified";

export interface GstinRecord {
  gstin: string;
  legalName: string | null;
  tradeName: string | null;
  status: GstinStatus;
  address: string | null;
  city: string | null;
  stateCode: string | null;
  stateName: string | null;
  taxpayerType: string | null;
  registeredOn: string | null;
  /** false when only the format/checksum was validated (no live lookup). */
  liveLookup: boolean;
}

export interface GstVerifyProvider {
  readonly name: string;
  verify(gstin: string): Promise<GstinRecord>;
}

/** Default: local validation only — never throws, never blocks a save. */
class NoopProvider implements GstVerifyProvider {
  readonly name = "noop";
  async verify(gstin: string): Promise<GstinRecord> {
    const g = (gstin || "").toUpperCase().trim();
    const code = parseStateFromGstin(g);
    return {
      gstin: g,
      legalName: null,
      tradeName: null,
      status: "unverified",
      address: null,
      city: null,
      stateCode: code,
      stateName: stateName(code),
      taxpayerType: null,
      registeredOn: null,
      liveLookup: false,
    };
  }
}

/**
 * Resolve the active provider. Real providers are selected with
 * GST_VERIFY_PROVIDER + GST_VERIFY_API_KEY; until those exist we degrade to the
 * Noop provider so the feature works offline.
 */
export function getGstVerifyProvider(): GstVerifyProvider {
  // Future: switch (process.env.GST_VERIFY_PROVIDER) { case "surepass": ... }
  return new NoopProvider();
}

export { validateGstin };
