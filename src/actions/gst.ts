"use server";

import { requireSession } from "@/lib/auth";
import { validateGstin } from "@/lib/gst";
import { getGstVerifyProvider, type GstinRecord } from "@/lib/gst-verify";

/**
 * Validate + (best-effort) verify a GSTIN. Always returns local format/checksum
 * validity; `record` is populated when a live provider is configured. Never
 * blocks the caller — a failing verify still lets the user save.
 */
export async function verifyGstin(
  gstin: string,
): Promise<
  | { ok: true; valid: boolean; reason?: string; record: GstinRecord }
  | { error: string }
> {
  await requireSession();
  const g = (gstin || "").toUpperCase().trim();
  const v = validateGstin(g);
  if (!v.valid) {
    return { ok: true, valid: false, reason: v.reason, record: emptyRecord(g) };
  }
  try {
    const record = await getGstVerifyProvider().verify(g);
    return { ok: true, valid: true, record };
  } catch {
    return { ok: true, valid: true, record: emptyRecord(g) };
  }
}

function emptyRecord(g: string): GstinRecord {
  return {
    gstin: g,
    legalName: null,
    tradeName: null,
    status: "unverified",
    address: null,
    city: null,
    stateCode: g.length >= 2 ? g.slice(0, 2) : null,
    stateName: null,
    taxpayerType: null,
    registeredOn: null,
    liveLookup: false,
  };
}
