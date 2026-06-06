export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Pure: value to render at `elapsed` ms, counting `from`→`to` over `dur` after `delay`. */
export function frameValue(
  to: number,
  from: number,
  dur: number,
  delay: number,
  elapsed: number,
): number {
  const t = Math.min(1, Math.max(0, (elapsed - delay) / dur));
  return Math.round(from + (to - from) * easeOutCubic(t));
}
