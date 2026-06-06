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

/** Square feet from inches (length × width / 144), rounded to 2 dp. */
export function sqFtFromInches(lengthIn: number, widthIn: number): number {
  return Math.round((lengthIn * widthIn) / 144 / 0.01) * 0.01;
}
