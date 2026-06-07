// Light touch feedback via the Vibration API (Android/Chrome; iOS Safari ignores it).
type Pattern = "tap" | "soft" | "success" | "warn";

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 8,
  soft: 4,
  success: [10, 40, 18],
  warn: [20, 50, 20],
};

export function haptic(kind: Pattern = "tap") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* unsupported — ignore */
  }
}
