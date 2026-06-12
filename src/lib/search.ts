/**
 * Tiny pure matcher behind "search everywhere". A query matches a record if the
 * (case-insensitive) query is contained in any of the record's text fields. We
 * also transliterate the fields, so a query typed in Latin ("rajesh") finds a
 * name stored in Hindi ("राजेश") and vice-versa.
 *
 * Matching is deliberately forgiving about vowel doubling: transliteration turns
 * the आ-matra into "aa", so "राजेश" → "raajesh". We collapse runs of the same
 * letter on both sides so a shop owner typing "rajesh" still finds it.
 *
 * Kept pure so the search page and its tests share the exact same logic.
 */

import { transliterate } from "./transliterate";

/** transliterate → lowercase → collapse consecutive duplicate letters/digits. */
function squash(s: string | null | undefined): string {
  return transliterate(String(s ?? ""))
    .toLowerCase()
    .replace(/([a-z0-9])\1+/g, "$1");
}

export function normalize(s: string | null | undefined): string {
  return squash(s);
}

/** Does `query` appear in any of `fields` (transliterated + vowel-collapsed)? */
export function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = squash(query.trim());
  if (!q) return false;
  return fields.some((f) => squash(f).includes(q));
}
