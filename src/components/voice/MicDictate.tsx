"use client";

import { useEffect, useState } from "react";
import { Mic, Square } from "lucide-react";
import { useSpeech } from "@/components/voice/useSpeech";
import { transliterate } from "@/lib/transliterate";

const LANG_KEY = "gos_voice_lang_v1";

/**
 * Reusable "tap and speak" mic for any text field. Reuses the shared useSpeech
 * hook and the same EN/Hindi preference as the command bar + daybook, and
 * transliterates Hindi to Latin so it reads consistently across the app. Hides
 * itself on browsers without speech support (typing still works everywhere).
 */
export default function MicDictate({
  onText,
  title = "Tap and speak",
  className = "",
}: {
  onText: (text: string) => void;
  title?: string;
  className?: string;
}) {
  const [lang, setLang] = useState("en-IN");
  useEffect(() => {
    const s = localStorage.getItem(LANG_KEY);
    if (s) setLang(s);
  }, []);
  const { supported, listening, start, stop } = useSpeech(lang);
  if (!supported) return null;

  return (
    <button
      type="button"
      title={title}
      aria-label={listening ? "Stop listening" : title}
      onClick={() =>
        listening
          ? stop()
          : start((t) => {
              const heard = transliterate(t).trim();
              if (heard) onText(heard);
            })
      }
      className={`shrink-0 grid place-items-center rounded-lg border w-9 h-9 transition-colors ${
        listening
          ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
          : "bg-gold/15 text-gold border-gold/40 hover:bg-gold/25"
      } ${className}`}
    >
      {listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  );
}
