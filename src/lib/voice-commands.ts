/**
 * Turns a spoken phrase into an app action. The voice command bar passes the raw
 * transcript here; we decide whether it's "go somewhere", "search for something",
 * or nothing. Pure + testable — no DOM, no router.
 *
 * Recognises both English and common Hindi verbs ("kholo", "dikhao", "khojo")
 * and Hindi section words, so a Hindi-speaking owner can drive the app by voice.
 */

export type VoiceAction =
  | { kind: "navigate"; href: string; label: string }
  | { kind: "search"; query: string }
  | { kind: "none"; transcript: string };

type Route = { keywords: string[]; href: string; label: string };

// Longer keywords are matched first so "batch payment" wins over "payment".
const ROUTES: Route[] = [
  { keywords: ["batch payment", "batch"], href: "/batch-payment", label: "Batch Payment" },
  { keywords: ["measurement sheet", "measurement", "measure", "naap", "नाप"], href: "/measure", label: "Measurement Sheet" },
  { keywords: ["voice note", "voice notes", "notes", "note"], href: "/notes", label: "Voice Notes" },
  { keywords: ["factory floor", "factory", "fabrication", "production", "फैक्ट्री"], href: "/factory", label: "Factory Floor" },
  { keywords: ["ai studio", "ai", "studio"], href: "/ai-studio", label: "AI Studio" },
  { keywords: ["daybook", "day book", "डेबुक"], href: "/daybook", label: "Daybook" },
  { keywords: ["logs", "log", "history"], href: "/logs", label: "Logs" },
  { keywords: ["suppliers", "supplier", "सप्लायर"], href: "/parties?tab=suppliers", label: "Suppliers" },
  { keywords: ["customers", "customer", "parties", "party", "ग्राहक"], href: "/parties", label: "Customers" },
  { keywords: ["quotation", "quotes", "quote", "कोटेशन"], href: "/quotes", label: "Quotes" },
  { keywords: ["orders", "order", "ऑर्डर"], href: "/orders", label: "Orders" },
  { keywords: ["money", "payments", "payment", "paisa", "पैसा"], href: "/money", label: "Money" },
  { keywords: ["stock", "inventory", "slabs", "slab", "स्टॉक"], href: "/inventory", label: "Stock" },
  { keywords: ["home", "dashboard", "होम"], href: "/dashboard", label: "Home" },
];

const SEARCH_VERBS = ["search for", "search", "find", "look for", "khojo", "dhundo", "ढूंढो", "खोजो"];
const NAV_VERBS = ["go to", "open", "show me", "show", "navigate to", "kholo", "dikhao", "खोलो", "दिखाओ", "जाओ", "jao"];

function stripPrefix(text: string, prefixes: string[]): { matched: boolean; rest: string } {
  for (const p of prefixes) {
    if (text === p) return { matched: true, rest: "" };
    if (text.startsWith(p + " ")) return { matched: true, rest: text.slice(p.length + 1).trim() };
  }
  return { matched: false, rest: text };
}

function findRoute(text: string): Route | null {
  for (const r of ROUTES) {
    if (r.keywords.some((k) => text.includes(k))) return r;
  }
  return null;
}

export function parseCommand(raw: string): VoiceAction {
  const transcript = (raw ?? "").trim();
  if (!transcript) return { kind: "none", transcript: raw ?? "" };
  const text = transcript.toLowerCase();

  // Explicit search intent: "search for granite", "khojo black galaxy"
  const search = stripPrefix(text, SEARCH_VERBS);
  if (search.matched) {
    return search.rest ? { kind: "search", query: search.rest } : { kind: "none", transcript };
  }

  // Navigation intent: "open customers", or a bare section word.
  const nav = stripPrefix(text, NAV_VERBS);
  const route = findRoute(nav.rest || text);
  if (route) return { kind: "navigate", href: route.href, label: route.label };

  // Unrecognised → treat the whole phrase as a search (preserve original case).
  return { kind: "search", query: transcript };
}
