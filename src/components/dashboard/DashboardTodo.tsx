"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListTodo, Plus, ArrowRight } from "lucide-react";
import { addTask, setTaskDone } from "@/actions/tasks";

type Task = { id: string; title: string; carriedDays: number };

/** Dashboard to-do — the top open Daybook tasks, completable inline. */
export default function DashboardTodo({
  initial,
  moreCount,
}: {
  initial: Task[];
  moreCount: number;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initial);
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  function complete(id: string) {
    setErr("");
    setTasks((t) => t.filter((x) => x.id !== id)); // optimistic
    start(async () => {
      const r = await setTaskDone(id, true);
      if (r && "error" in r) setErr(r.error ?? "Couldn't update the task.");
      router.refresh();
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const text = val.trim();
    if (!text) return;
    setErr("");
    setVal("");
    start(async () => {
      const r = await addTask(text);
      if (r && "error" in r) {
        setErr(r.error ?? "Couldn't add the task.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-4 rounded-2xl border border-graphite-600 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold">
          <ListTodo className="w-4 h-4" /> To-do
        </span>
        <Link href="/daybook" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-gold">
          Daybook <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <form onSubmit={add} className="mt-3 flex gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Add a task…"
          className="flex-1 text-sm focus:border-gold outline-none"
        />
        <button
          type="submit"
          disabled={pending || !val.trim()}
          aria-label="Add task"
          className="inline-flex items-center justify-center rounded-xl bg-gold/15 text-gold border border-gold/40 w-9 h-9 shrink-0 disabled:opacity-50 hover:bg-gold/20 transition"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      <div className="mt-3 space-y-1.5">
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">Nothing pending — add a task above. 🎉</p>
        ) : (
          tasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-xl border border-graphite-600/60 bg-white/[0.02] px-3 py-2"
            >
              <button
                onClick={() => complete(t.id)}
                disabled={pending}
                title="Mark done"
                aria-label={`Mark "${t.title}" done`}
                className="w-5 h-5 shrink-0 rounded-md border border-graphite-500 hover:border-gold hover:bg-gold/10 transition disabled:opacity-50"
              />
              <span className="flex-1 text-sm text-slate-200 truncate">{t.title}</span>
              {t.carriedDays > 0 && (
                <span className="text-[10px] font-semibold text-amber-300/80 shrink-0" title="days carried over">
                  {t.carriedDays}d
                </span>
              )}
            </div>
          ))
        )}
        {moreCount > 0 && (
          <Link
            href="/daybook"
            className="block text-center text-xs text-slate-500 hover:text-gold pt-1"
          >
            +{moreCount} more in Daybook
          </Link>
        )}
      </div>
      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
    </div>
  );
}
