/**
 * Indian GST helpers for GraniteOS — pure functions, no I/O.
 * All money is in paise (integer). See docs/superpowers/specs/2026-06-08-gst-compliance-design.md
 */

export type SupplyType = "intra" | "inter";

// ── GST state codes (first 2 digits of a GSTIN) ────────────────────────────
export const GST_STATES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "25", name: "Daman & Diu" },
  { code: "26", name: "Dadra & Nagar Haveli" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh (old)" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
];

const STATE_BY_CODE: Record<string, string> = Object.fromEntries(
  GST_STATES.map((s) => [s.code, s.name]),
);

/** Full state name for a 2-digit GST code, or "" if unknown. */
export function stateName(code: string | null | undefined): string {
  if (!code) return "";
  return STATE_BY_CODE[code] ?? "";
}

/** "Maharashtra (27)" label, or just the code if the name is unknown. */
export function stateLabel(code: string | null | undefined): string {
  if (!code) return "—";
  const n = stateName(code);
  return n ? `${n} (${code})` : code;
}

// ── GSTIN format + mod-36 check-digit validation (no network) ──────────────
const GSTIN_RE =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const GC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function validateGstin(input: string): { valid: boolean; reason?: string } {
  const g = (input || "").toUpperCase().trim();
  if (g.length !== 15) {
    return { valid: false, reason: "GSTIN must be 15 characters" };
  }
  if (!GSTIN_RE.test(g)) {
    return { valid: false, reason: "Wrong format (2-digit state + PAN + entity + Z + check digit)" };
  }
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = GC.indexOf(g[i]);
    const factor = i % 2 === 0 ? 1 : 2;
    const p = v * factor;
    sum += Math.floor(p / 36) + (p % 36);
  }
  const check = GC[(36 - (sum % 36)) % 36];
  if (check !== g[14]) {
    return { valid: false, reason: "Invalid check digit (likely a typo)" };
  }
  return { valid: true };
}

/** First two characters of a (format-valid) GSTIN, else null. */
export function parseStateFromGstin(gstin: string | null | undefined): string | null {
  const g = (gstin || "").toUpperCase().trim();
  if (!/^[0-9]{2}/.test(g)) return null;
  return g.slice(0, 2);
}

// ── Place-of-supply → tax split ────────────────────────────────────────────
export function supplyType(sellerStateCode: string, placeOfSupplyCode: string): SupplyType {
  return sellerStateCode === placeOfSupplyCode ? "intra" : "inter";
}

/**
 * Split a line's tax (paise) by supply type.
 * Intra: CGST = SGST = half each. Inter: all IGST.
 */
export function splitLineTax(
  taxablePaise: number,
  gstRatePct: number,
  type: SupplyType,
): { cgst: number; sgst: number; igst: number } {
  if (!gstRatePct) return { cgst: 0, sgst: 0, igst: 0 };
  // Round the whole line tax first, then split — so CGST+SGST always equals the
  // intended tax and an intra-state line totals the same as the inter-state one
  // (avoids a 1-paise drift from rounding each half independently).
  const total = Math.round((taxablePaise * gstRatePct) / 100);
  if (type === "intra") {
    const cgst = Math.floor(total / 2);
    return { cgst, sgst: total - cgst, igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: total };
}

/** Round a total to the nearest rupee; returns the signed round-off (paise). */
export function computeRoundOff(totalPaise: number): {
  roundedTotalPaise: number;
  roundOffPaise: number;
} {
  const roundedTotalPaise = Math.round(totalPaise / 100) * 100;
  return { roundedTotalPaise, roundOffPaise: roundedTotalPaise - totalPaise };
}

// ── Amount in words (Indian system) ────────────────────────────────────────
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? " " + ONES[o] : "");
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let s = "";
  if (h) s += ONES[h] + " Hundred";
  if (rest) s += (s ? " " : "") + twoDigits(rest);
  return s;
}

function indianWords(n: number): string {
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;
  const parts: string[] = [];
  if (crore) parts.push(indianWords(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(" ");
}

/** "Rupees Two Lakh Thirty Four Thousand Only" (with " and N Paise" when present). */
export function amountInWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const p = paise % 100;
  if (rupees === 0 && p === 0) return "Rupees Zero Only";
  let s = "Rupees " + indianWords(rupees);
  if (p > 0) s += " and " + twoDigits(p) + " Paise";
  return s + " Only";
}

// ── HSN / SAC smart defaults for the stone trade ───────────────────────────
export const HSN_PRESETS: { code: string; rate: number; label: string }[] = [
  { code: "6802", rate: 18, label: "Worked granite/marble slabs & tiles (18%)" },
  { code: "2516", rate: 5, label: "Raw granite blocks (5%)" },
  { code: "2515", rate: 5, label: "Raw marble blocks (5%)" },
  { code: "9988", rate: 18, label: "Fabrication / job-work — SAC (18%)" },
];
export const DEFAULT_HSN = "6802";

/**
 * Financial-year start year for a date (India FY = Apr–Mar).
 * 2026-06 → 2026; 2026-02 → 2025.
 */
export function financialYear(date: Date): number {
  const y = date.getFullYear();
  return date.getMonth() >= 3 ? y : y - 1;
}
