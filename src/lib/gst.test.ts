import { describe, it, expect } from "vitest";
import {
  validateGstin,
  parseStateFromGstin,
  supplyType,
  splitLineTax,
  computeRoundOff,
  amountInWords,
  stateName,
  GST_STATES,
} from "./gst";

describe("validateGstin", () => {
  it("accepts a GSTIN with a correct check digit", () => {
    // 27ABCDE1234F1Z0 — Maharashtra, valid mod-36 check digit
    expect(validateGstin("27ABCDE1234F1Z0").valid).toBe(true);
  });

  it("is case-insensitive and trims", () => {
    expect(validateGstin("  27abcde1234f1z0 ").valid).toBe(true);
  });

  it("rejects a wrong check digit", () => {
    const r = validateGstin("27ABCDE1234F1Z5");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/check digit/i);
  });

  it("rejects wrong length / charset", () => {
    expect(validateGstin("27ABCDE1234F1Z").valid).toBe(false); // 14 chars
    expect(validateGstin("AB1234").valid).toBe(false);
    expect(validateGstin("").valid).toBe(false);
  });
});

describe("parseStateFromGstin", () => {
  it("returns the first two digits", () => {
    expect(parseStateFromGstin("27ABCDE1234F1Z0")).toBe("27");
  });
  it("returns null for junk", () => {
    expect(parseStateFromGstin("xx")).toBe(null);
  });
});

describe("supplyType", () => {
  it("same state code is intra-state", () => {
    expect(supplyType("27", "27")).toBe("intra");
  });
  it("different state code is inter-state", () => {
    expect(supplyType("27", "29")).toBe("inter");
  });
});

describe("splitLineTax", () => {
  it("splits intra-state into CGST + SGST that sum to the whole line tax", () => {
    // ₹22,662.50 taxable @18% → ₹4,079.25 tax → 2039.62 + 2039.63
    const r = splitLineTax(2266250, 18, "intra");
    expect(r.cgst).toBe(203962);
    expect(r.sgst).toBe(203963);
    expect(r.cgst + r.sgst).toBe(407925);
    expect(r.igst).toBe(0);
  });
  it("puts all inter-state tax into IGST", () => {
    const r = splitLineTax(2266250, 18, "inter");
    expect(r.igst).toBe(407925);
    expect(r.cgst).toBe(0);
    expect(r.sgst).toBe(0);
  });
  it("intra and inter total the same tax for the same taxable value", () => {
    const intra = splitLineTax(2266250, 18, "intra");
    const inter = splitLineTax(2266250, 18, "inter");
    expect(intra.cgst + intra.sgst).toBe(inter.igst);
  });
  it("handles 0% (exempt) lines", () => {
    expect(splitLineTax(100000, 0, "intra")).toEqual({ cgst: 0, sgst: 0, igst: 0 });
  });
});

describe("computeRoundOff", () => {
  it("rounds .50 up", () => {
    const r = computeRoundOff(12350);
    expect(r.roundedTotalPaise).toBe(12400);
    expect(r.roundOffPaise).toBe(50);
  });
  it("rounds .49 down", () => {
    const r = computeRoundOff(12349);
    expect(r.roundedTotalPaise).toBe(12300);
    expect(r.roundOffPaise).toBe(-49);
  });
  it("is zero on an exact rupee", () => {
    expect(computeRoundOff(12300)).toEqual({ roundedTotalPaise: 12300, roundOffPaise: 0 });
  });
});

describe("amountInWords", () => {
  it("words zero", () => {
    expect(amountInWords(0)).toBe("Rupees Zero Only");
  });
  it("words a rupee amount in the Indian system", () => {
    // ₹2,34,000
    expect(amountInWords(23400000)).toBe("Rupees Two Lakh Thirty Four Thousand Only");
  });
  it("words rupees with paise", () => {
    expect(amountInWords(12345)).toBe("Rupees One Hundred Twenty Three and Forty Five Paise Only");
  });
  it("words lakhs and grand total style", () => {
    expect(amountInWords(6639000)).toBe("Rupees Sixty Six Thousand Three Hundred Ninety Only");
  });
});

describe("state metadata", () => {
  it("maps a code to a name", () => {
    expect(stateName("27")).toBe("Maharashtra");
    expect(stateName("29")).toBe("Karnataka");
  });
  it("exposes a non-empty state list", () => {
    expect(GST_STATES.length).toBeGreaterThan(30);
  });
});
