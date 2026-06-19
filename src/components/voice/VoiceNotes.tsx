"use client";

import { useEffect, useState } from "react";
import { Mic, Square, Trash2, Languages, Plus, RotateCcw, ArrowLeft } from "lucide-react";
import { useSpeech } from "@/components/voice/useSpeech";
import { transliterate, hasDevanagari } from "@/lib/transliterate";
import ConfettiBurst from "@/components/voice/ConfettiBurst";

/**
 * Voice notes — quick spoken reminders for the shop ("call Rajesh about the
 * Statuario order"). Local-first (localStorage) so it needs no table/migration;
 * dictate in Hindi or English and one tap transliterates Devanagari to Latin.
 * Deleting a note moves it to a recycle bin that auto-empties after 7 days.
 */

type Note = { id: string; text: string; at: string };
type TrashNote = Note & { deletedAt: string };

const KEY = "gos_voice_notes_v1";
const TRASH_KEY = "gos_voice_notes_trash_v1";
const LANG_KEY = "gos_voice_lang_v1";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

function load(): Note[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
  } catch {
    return [];
  }
}

/** Load the recycle bin, dropping anything older than 7 days. */
function loadTrash(): TrashNote[] {
  try {
    const raw = localStorage.getItem(TRASH_KEY);
    const arr = raw ? (JSON.parse(raw) as TrashNote[]) : [];
    const now = Date.now();
    return arr.filter((t) => now - new Date(t.deletedAt).getTime() < WEEK_MS);
  } catch {
    return [];
  }
}

function daysLeft(deletedAt: string): number {
  const elapsed = Date.now() - new Date(deletedAt).getTime();
  return Math.max(0, Math.ceil((WEEK_MS - elapsed) / 86_400_000));
}

export default function VoiceNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [trash, setTrash] = useState<TrashNote[]>([]);
  const [view, setView] = useState<"notes" | "trash">("notes");
  const [draft, setDraft] = useState("");
  const [lang, setLang] = useState("en-IN");
  const [fire, setFire] = useState(0);
  const { supported, listening, interim, error, start, stop } = useSpeech(lang);

  useEffect(() => {
    setNotes(load());
    const purged = loadTrash();
    setTrash(purged);
    // Re-persist the purged bin so expired notes are gone for good.
    try {
      localStorage.setItem(TRASH_KEY, JSON.stringify(purged));
    } catch {}
    const savedLang = localStorage.getItem(LANG_KEY);
    if (savedLang) setLang(savedLang);
  }, []);

  const persist = (next: Note[]) => {
    setNotes(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };
  const persistTrash = (next: TrashNote[]) => {
    setTrash(next);
    try {
      localStorage.setItem(TRASH_KEY, JSON.stringify(next));
    } catch {}
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
    const note: Note = { id: uid(), text, at: new Date().toISOString() };
    persist([note, ...notes]);
    setDraft("");
    setFire((f) => f + 1);
  };

  // Soft-delete → recycle bin.
  const remove = (id: string) => {
    const note = notes.find((n) => n.id === id);
    persist(notes.filter((n) => n.id !== id));
    if (note) persistTrash([{ ...note, deletedAt: new Date().toISOString() }, ...trash]);
  };
  const restore = (id: string) => {
    const t = trash.find((n) => n.id === id);
    persistTrash(trash.filter((n) => n.id !== id));
    if (t) {
      const { deletedAt: _drop, ...note } = t;
      void _drop;
      persist([note, ...notes]);
    }
  };
  const purgeOne = (id: string) => persistTrash(trash.filter((n) => n.id !== id));

  const toLatin = (id: string) =>
    persist(notes.map((n) => (n.id === id ? { ...n, text: transliterate(n.text) } : n)));

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  // ── Recycle bin view ──────────────────────────────────────────────────────
  if (view === "trash") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setView("notes")}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-gold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to notes
        </button>
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-bold text-white">Recycle bin</h2>
          <span className="text-xs text-slate-500">· auto-empties after 7 days</span>
        </div>

        {trash.length === 0 ? (
          <div className="flex flex-col items-center text-center py-8 text-slate-500">
            <Trash2 className="w-9 h-9 mb-2" />
            <p className="text-sm">Recycle bin is empty.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {trash.map((n) => (
              <li key={n.id} className="rounded-xl border border-graphite-600 bg-white/[0.03] px-4 py-3">
                <p className="text-sm text-slate-300 whitespace-pre-wrap line-through decoration-slate-600">{n.text}</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-[11px] text-amber-300/80">{daysLeft(n.deletedAt)}d left</span>
                  <button
                    onClick={() => restore(n.id)}
                    className="ml-auto text-[11px] text-gold hover:text-gold/80 inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Restore
                  </button>
                  <button
                    onClick={() => purgeOne(n.id)}
                    className="text-[11px] text-slate-500 hover:text-rose-300 inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete forever
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ── Notes view ────────────────────────────────────────────────────────────
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

      {/* Recycle bin entry */}
      {trash.length > 0 && (
        <button
          onClick={() => setView("trash")}
          className="w-full flex items-center gap-2 rounded-xl border border-graphite-600 bg-white/[0.02] px-4 py-2.5 text-sm text-slate-400 hover:text-gold hover:border-gold/40 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Recycle bin
          <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-white/[0.06] text-[11px] font-semibold text-slate-300">
            {trash.length}
          </span>
        </button>
      )}

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
