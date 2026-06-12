"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, Plus, Check, Trash2, Undo2, CalendarClock } from "lucide-react";
import { addTask, setTaskDone, deleteTask } from "@/actions/tasks";
import { useSpeech } from "@/components/voice/useSpeech";
import { transliterate } from "@/lib/transliterate";
import ConfettiBurst from "@/components/voice/ConfettiBurst";
import type { OpenTask, TaskRow, DoneDay } from "@/lib/tasks";

const LANG_KEY = "gos_voice_lang_v1";

export default function TaskList({
  open,
  doneToday,
  history,
}: {
  open: OpenTask[];
  doneToday: TaskRow[];
  history: DoneDay[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState(false); // voice heard → confirm before it joins the list
  const [error, setError] = useState("");
  const [fire, setFire] = useState(0);
  const [lang, setLang] = useState("en-IN");
  const [pending, start] = useTransition();
  const { supported, listening, interim, error: micError, start: listen, stop } = useSpeech(lang);

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved) setLang(saved);
  }, []);

  const toggleLang = () => {
    const next = lang === "en-IN" ? "hi-IN" : "en-IN";
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
  };

  const dictate = () => {
    if (listening) return stop();
    setError("");
    listen((text) => {
      const heard = transliterate(text).trim();
      if (!heard) return;
      setDraft(heard);
      setConfirming(true); // never auto-add — the owner confirms what was heard
    });
  };

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setError("");
    start(async () => {
      const res = await addTask(text);
      if (res.error) return setError(res.error);
      setDraft("");
      setConfirming(false);
      router.refresh();
    });
  };

  const complete = (id: string) =>
    start(async () => {
      const res = await setTaskDone(id, true);
      if (res.error) return setError(res.error);
      setFire((f) => f + 1);
      router.refresh();
    });

  const reopen = (id: string) =>
    start(async () => {
      const res = await setTaskDone(id, false);
      if (res.error) return setError(res.error);
      router.refresh();
    });

  const remove = (id: string) =>
    start(async () => {
      const res = await deleteTask(id);
      if (res.error) return setError(res.error);
      router.refresh();
    });

  const sinceLabel = (t: OpenTask) =>
    new Date(t.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

  return (
    <div className="space-y-5">
      <ConfettiBurst fire={fire} label="Task done 🎉" />

      {/* add box — type, or speak and confirm */}
      <div className="rounded-2xl border border-graphite-600 bg-white/[0.04] backdrop-blur p-4 space-y-3">
        <div className="flex gap-2">
          <input
            value={listening && interim ? transliterate(interim) : draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setConfirming(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={listening ? "Listening…" : "Add a task — type, or tap the mic and speak"}
            className="flex-1 text-base focus:border-gold outline-none"
          />
          {supported && (
            <button
              onClick={dictate}
              aria-label={listening ? "Stop listening" : "Speak a task"}
              className={`shrink-0 w-[52px] grid place-items-center rounded-xl border ${
                listening
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-gold/15 text-gold border-gold/40"
              }`}
            >
              {listening ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}
        </div>

        {confirming && draft.trim() ? (
          <div className="rounded-xl border border-gold/40 bg-gold/[0.07] px-3 py-2.5">
            <p className="text-xs text-slate-400">Heard this — add it?</p>
            <p className="text-sm font-semibold text-white mt-0.5">{draft.trim()}</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={submit}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-granite-green2 text-white px-3 py-1.5 text-xs font-bold disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> Add task
              </button>
              <button
                onClick={() => {
                  setConfirming(false);
                  setDraft("");
                }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Discard
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={submit}
              disabled={pending || !draft.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-granite-green2 disabled:opacity-40 text-white px-4 py-2 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
            {supported && (
              <button onClick={toggleLang} className="text-xs text-slate-400 hover:text-gold px-2 py-2">
                Voice: {lang === "en-IN" ? "EN" : "हिं"}
              </button>
            )}
          </div>
        )}

        {(error || micError) && <p className="text-xs text-rose-300">{error || micError}</p>}
        {!supported && (
          <p className="text-xs text-slate-500">Voice input needs Chrome — typing works everywhere.</p>
        )}
      </div>

      {/* today's open tasks (carry-forward) */}
      <section>
        <h2 className="text-sm font-bold text-slate-300 mb-2">
          To do <span className="text-slate-500 font-normal">· {open.length}</span>
        </h2>
        {open.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            Nothing pending. Speak a task to start the day.
          </p>
        ) : (
          <ul className="space-y-2">
            {open.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-xl border border-graphite-600 bg-white/[0.04] px-3.5 py-3"
              >
                <button
                  onClick={() => complete(t.id)}
                  disabled={pending}
                  aria-label="Mark done"
                  className="shrink-0 w-7 h-7 min-h-0 grid place-items-center rounded-full border-2 border-granite-green2/60 text-transparent hover:text-granite-green2 hover:bg-granite-green2/10 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-100 leading-snug">{t.title}</p>
                  {t.carriedDays > 0 && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-amber-300">
                      <CalendarClock className="w-3 h-3" />
                      carried {t.carriedDays} day{t.carriedDays === 1 ? "" : "s"} · since {sinceLabel(t)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => remove(t.id)}
                  disabled={pending}
                  aria-label="Delete task"
                  className="shrink-0 min-h-0 text-slate-500 hover:text-rose-300 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* finished today */}
      {doneToday.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-slate-300 mb-2">
            Done today <span className="text-slate-500 font-normal">· {doneToday.length}</span>
          </h2>
          <ul className="space-y-2">
            {doneToday.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-xl border border-graphite-600/60 bg-white/[0.02] px-3.5 py-3"
              >
                <span className="shrink-0 w-7 h-7 grid place-items-center rounded-full bg-granite-green2/15 text-granite-green2">
                  <Check className="w-4 h-4" />
                </span>
                <p className="flex-1 text-sm text-slate-400 line-through leading-snug">{t.title}</p>
                <button
                  onClick={() => reopen(t.id)}
                  disabled={pending}
                  aria-label="Reopen task"
                  className="shrink-0 min-h-0 text-slate-500 hover:text-gold p-1"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* earlier days */}
      {history.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-slate-300 mb-2">Earlier</h2>
          <div className="space-y-3">
            {history.map((d) => (
              <div key={d.dayKey}>
                <p className="text-xs text-slate-500 mb-1.5 px-1">{d.label}</p>
                <ul className="space-y-1.5">
                  {d.rows.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-2.5 rounded-lg border border-graphite-600/40 bg-white/[0.02] px-3 py-2"
                    >
                      <Check className="w-3.5 h-3.5 text-granite-green2 shrink-0" />
                      <p className="text-xs text-slate-500 line-through">{t.title}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
