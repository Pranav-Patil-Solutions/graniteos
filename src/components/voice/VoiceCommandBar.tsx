"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, Search, CornerDownLeft, ArrowRight } from "lucide-react";
import { useSpeech } from "@/components/voice/useSpeech";
import { parseCommand } from "@/lib/voice-commands";
import { transliterate } from "@/lib/transliterate";

/**
 * The main feature: drive GraniteOS by voice. A floating mic (above the tab bar)
 * opens a listening sheet; speak a section name to jump there ("open customers",
 * "kholo daybook") or "search black galaxy" to search everything. Hindi or
 * English, switchable. Recognised speech is transliterated to Latin for display.
 */

const LANGS = [
  { code: "en-IN", short: "EN" },
  { code: "hi-IN", short: "हिं" },
];
const LANG_KEY = "gos_voice_lang_v1";

export default function VoiceCommandBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState("en-IN");
  const [result, setResult] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const { supported, listening, interim, error, start, stop } = useSpeech(lang);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved) setLang(saved);
  }, []);

  const setLanguage = (code: string) => {
    setLang(code);
    localStorage.setItem(LANG_KEY, code);
  };

  const run = useCallback(
    (raw: string) => {
      const heard = transliterate(raw);
      const action = parseCommand(raw);
      if (action.kind === "navigate") {
        setResult(`→ ${action.label}`);
        router.push(action.href);
        idleTimer.current = setTimeout(() => setOpen(false), 900);
      } else if (action.kind === "search") {
        setResult(`Searching “${heard}”`);
        router.push(`/search?q=${encodeURIComponent(raw)}`);
        idleTimer.current = setTimeout(() => setOpen(false), 900);
      } else {
        setResult("Didn't catch a command — try “open customers”.");
      }
    },
    [router],
  );

  const launch = () => {
    setResult(null);
    setTyped("");
    setOpen(true);
    if (supported) start(run); // no mic? the sheet still opens with the typed box
  };

  const close = () => {
    stop();
    if (idleTimer.current) clearTimeout(idleTimer.current);
    setOpen(false);
    setResult(null);
    setTyped("");
  };

  const runTyped = () => {
    const text = typed.trim();
    if (!text) return;
    stop();
    run(text);
    setTyped("");
  };

  useEffect(() => () => { if (idleTimer.current) clearTimeout(idleTimer.current); }, []);

  return (
    <>
      {/* Floating mic — sits above the bottom tab bar */}
      <button
        onClick={launch}
        aria-label="Voice command"
        className="fixed right-4 bottom-24 z-50 w-14 h-14 grid place-items-center rounded-full bg-gold text-graphite-900 shadow-xl shadow-black/40 active:scale-95 transition-transform"
      >
        <Mic className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 z-[75] bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="fixed inset-x-0 bottom-0 z-[76] rounded-t-3xl border-t border-graphite-600 bg-graphite-900 px-5 pt-5 pb-8"
              style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1 rounded-full bg-white/[0.05] p-1">
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setLanguage(l.code)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        lang === l.code ? "bg-gold text-graphite-900" : "text-slate-400"
                      }`}
                    >
                      {l.short}
                    </button>
                  ))}
                </div>
                <button onClick={close} aria-label="Close" className="w-9 h-9 grid place-items-center text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col items-center text-center py-2">
                <div className="relative mb-4">
                  {listening && (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-gold/30"
                      animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  )}
                  <button
                    onClick={() => (listening ? stop() : start(run))}
                    className="relative w-20 h-20 grid place-items-center rounded-full bg-gold text-graphite-900"
                  >
                    <Mic className="w-9 h-9" />
                  </button>
                </div>

                {!supported ? (
                  <p className="text-sm text-slate-400">
                    Voice needs Chrome — type your command below instead.
                  </p>
                ) : listening ? (
                  <p className="text-sm text-slate-300 min-h-[1.5rem]">
                    {interim ? transliterate(interim) : "Listening… say “open customers” or “search black galaxy”"}
                  </p>
                ) : result ? (
                  <p className="text-base font-semibold text-gold flex items-center gap-2">
                    {result.startsWith("Searching") ? <Search className="w-4 h-4" /> : <CornerDownLeft className="w-4 h-4" />}
                    {result}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">Tap the mic and speak — or type below.</p>
                )}

                {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
              </div>

              {/* typed fallback — same commands, works in every browser */}
              <div className="mt-4 flex gap-2">
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runTyped()}
                  placeholder="Type: open customers · search black galaxy"
                  className="flex-1 text-sm focus:border-gold outline-none"
                />
                <button
                  onClick={runTyped}
                  disabled={!typed.trim()}
                  aria-label="Run command"
                  className="shrink-0 w-[52px] grid place-items-center rounded-xl bg-gold/15 text-gold border border-gold/40 disabled:opacity-40"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {["customers", "measurement sheet", "daybook", "factory floor", "money"].map((s) => (
                  <button
                    key={s}
                    onClick={() => { stop(); run(s); }}
                    className="min-h-0 text-[11px] text-slate-500 hover:text-gold bg-white/[0.04] rounded-full px-2.5 py-1"
                  >
                    “{s}”
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
