/** Money is stored in paise (1 INR = 100 paise). These convert + format. */

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** "₹1,23,456" — Indian grouping, no decimals. */
export function formatINR(paise: number): string {
  return "₹" + Math.round(paiseToRupees(paise)).toLocaleString("en-IN");
}

/** "₹1,234.50" — with paise, for rates. */
export function formatINRPrecise(paise: number): string {
  return (
    "₹" +
    paiseToRupees(paise).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Compact Indian money for KPIs/headlines: "₹42.8L" · "₹14.6L" · "₹68K" · "₹920".
 * Lakh/crore scale (en-IN), 1 decimal max, trailing ".0" dropped, negative-safe.
 */
export function formatINRCompact(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const r = Math.abs(paiseToRupees(paise));
  const trim = (x: number) => (+x.toFixed(1)).toString();
  if (r >= 1_00_00_000) return `${sign}₹${trim(r / 1_00_00_000)}Cr`;
  if (r >= 1_00_000) return `${sign}₹${trim(r / 1_00_000)}L`;
  if (r >= 1_000) return `${sign}₹${trim(r / 1_000)}K`;
  return `${sign}₹${Math.round(r).toLocaleString("en-IN")}`;
}

/** Muted suffix label for big figures: "2.4 lakh" / "1.3 crore". "" if < ₹1 lakh. */
export function formatINRShort(paise: number): string {
  const r = Math.abs(paiseToRupees(paise));
  if (r >= 1_00_00_000) return `${+(r / 1_00_00_000).toFixed(2)} crore`;
  if (r >= 1_00_000) return `${+(r / 1_00_000).toFixed(2)} lakh`;
  return "";
}

/** Square feet from inches (length × width / 144), rounded to 2 dp. */
export function sqFtFromInches(lengthIn: number, widthIn: number): number {
  return Math.round((lengthIn * widthIn) / 144 / 0.01) * 0.01;
}
