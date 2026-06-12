/**
 * Hindi (Devanagari) → Latin transliteration, tuned for names typed or spoken
 * in Hindi. Phonetic, not strict IAST — the goal is a readable Latin spelling a
 * shop owner would recognise ("राजेश" → "rajesh", "भारत" → "bharat").
 *
 * Pure + dependency-free so it runs the same on server, client, and in tests.
 * Handles the inherent schwa (deleted word-finally, like real Hindi), matras,
 * the virama/halant, anusvara/visarga, and Devanagari digits. Any non-Devanagari
 * character (Latin, spaces, punctuation) passes through untouched, so mixed
 * " राजेश Traders" stays sensible.
 */

const CONSONANTS: Record<string, string> = {
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "v", "ळ": "l",
  "श": "sh", "ष": "sh", "स": "s", "ह": "h",
  // nukta forms
  "क़": "q", "ख़": "kh", "ग़": "gh", "ज़": "z", "ड़": "r", "ढ़": "rh", "फ़": "f", "य़": "y",
};

const VOWELS: Record<string, string> = {
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo",
  "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au",
  "ऑ": "o", "ऒ": "o",
};

const MATRAS: Record<string, string> = {
  "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo",
  "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "o",
};

const SIGNS: Record<string, string> = { "ं": "n", "ः": "h", "ँ": "n" };
const VIRAMA = "्";
const DIGITS: Record<string, string> = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

/** True when ch is a Devanagari combining mark (matra/virama/sign). */
function isCombining(ch: string | undefined): boolean {
  return ch !== undefined && (ch in MATRAS || ch in SIGNS || ch === VIRAMA);
}

/** Word boundary for schwa deletion: end of string, or a non-Devanagari char. */
function endsWord(ch: string | undefined): boolean {
  if (ch === undefined) return true;
  return !(ch in CONSONANTS || ch in VOWELS || isCombining(ch));
}

export function transliterate(input: string): string {
  if (!input) return input;
  const chars = [...input];
  let out = "";

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];

    if (c in CONSONANTS) {
      out += CONSONANTS[c];
      const next = chars[i + 1];
      if (next === VIRAMA) {
        i++; // halant: kill the inherent vowel, drop the cluster joiner
        continue;
      }
      if (next !== undefined && next in MATRAS) {
        out += MATRAS[next];
        i++;
        continue;
      }
      // bare consonant → inherent "a", except at the end of a word (schwa drop)
      if (!endsWord(next)) out += "a";
      continue;
    }

    if (c in VOWELS) { out += VOWELS[c]; continue; }
    if (c in MATRAS) { out += MATRAS[c]; continue; } // stray matra
    if (c in SIGNS) { out += SIGNS[c]; continue; }
    if (c in DIGITS) { out += DIGITS[c]; continue; }
    if (c === VIRAMA) continue; // dangling halant
    out += c; // Latin, spaces, punctuation — pass through
  }

  return out;
}

/** True if the string contains any Devanagari we can transliterate. */
export function hasDevanagari(input: string): boolean {
  return /[ऀ-ॿ]/.test(input);
}
