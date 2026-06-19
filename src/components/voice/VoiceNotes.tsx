"use client";

import { useEffect, useState } from "react";
import { Mic, Square, Trash2, Languages, Plus } from "lucide-react";
import { useSpeech } from "@/components/voice/useSpeech";
import { transliterate, hasDevanagari } from "@/lib/transliterate";
import ConfettiBurst from "@/components/voice/ConfettiBurst";

/**
 * Voice notes — quick spoken reminders for the shop ("call Rajesh about the
 * Statuario order"). Local-first (localStorage) so it needs no table/migration;
 * dictate in Hindi or English and one tap transliterates Devanagari to Latin.
 */

type Note = { id: string; text: string; at: string };
const KEY = "gos_voice_notes_v1";
const LANG_KEY = "gos_voice_lang_v1";

function load(): Note[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
  } catch {
    return [];
  }
}

export default function VoiceNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [lang, setLang] = useState("en-IN");
  const [fire, setFire] = useState(0);
  const { supported, listening, interim, error, start, stop } = useSpeech(lang);

  useEffect(() => {
    setNotes(load());
    const savedLang = localStorage.getItem(LANG_KEY);
    if (savedLang) setLang(savedLang);
  }, []);

  const persist = (next: Note[]) => {
    setNotes(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const dictate = () => {
    if (listening) return stop();
    start((text) => setDraft((d) => (d ? `${d} ${text}` : text)));
  };

  const toggleLang = () => {
    const next = lang === "en-IN" ? "hi-IN" : "en-IN";
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
  };

  const save = () => {
    const text = draft.trim();
    if (!text) return;
    const note: Note = { id: `${notes.length}-${text.length}-${text.slice(0, 4)}`, text, at: new Date().toISOString() };
    persist([note, ...notes]);
    setDraft("");
    setFire((f) => f + 1);
  };

  const remove = (id: string) => persist(notes.filter((n) => n.id !== id));
  const toLatin = (id: string) =>
    persist(notes.map((n) => (n.id === id ? { ...n, text: transliterate(n.text) } : n)));

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <ConfettiBurst fire={fire} label="Note saved" />

      <div className="rounded-2xl border border-graphite-600 bg-white/[0.04] backdrop-blur p-4 space-y-3">
        <textarea
          value={listening && interim ? `${draft} ${transliterate(interim)}`.trim() : draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Type, or tap the mic and speak…"
          className="w-full resize-none rounded-lg bg-white/[0.04] border border-graphite-600 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
        <div className="flex items-center gap-2">
          {supported && (
            <button
              onClick={dictate}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${
                listening ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : "bg-gold/15 text-gold border border-gold/40"
              }`}
            >
              {listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {listening ? "Stop" : "Speak"}
            </button>
          )}
          <button onClick={toggleLang} className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.05] px-3 py-2 text-sm text-slate-300">
            <Languages className="w-4 h-4" /> {lang === "en-IN" ? "EN" : "हिं"}
          </button>
          <button
            onClick={save}
            disabled={!draft.trim()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-granite-green2 disabled:opacity-40 text-white px-4 py-2 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Save
          </button>
        </div>
        {error && <p className="text-xs text-rose-300">{error}</p>}
        {!supported && <p className="text-xs text-slate-500">Voice input needs Chrome — you can still type notes.</p>}
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center text-center py-8 text-slate-500">
          <Mic className="w-9 h-9 mb-2" />
          <p className="text-sm">No notes yet — tap the mic and speak your first reminder above.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl border border-graphite-600 bg-white/[0.03] px-4 py-3">
              <p className="text-sm text-slate-100 whitespace-pre-wrap">{n.text}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-[11px] text-slate-500">{fmt(n.at)}</span>
                {hasDevanagari(n.text) && (
                  <button onClick={() => toLatin(n.id)} className="text-[11px] text-gold inline-flex items-center gap-1">
                    <Languages className="w-3 h-3" /> → Latin
                  </button>
                )}
                <button onClick={() => remove(n.id)} className="ml-auto text-[11px] text-slate-500 hover:text-rose-300 inline-flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
