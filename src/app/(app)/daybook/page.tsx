import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import TaskList from "@/components/daybook/TaskList";
import { groupTasks, type TaskRow } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function DaybookPage() {
  const me = await requireSession();
  const isOwner = can(me.role, "inviteTeamMember");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("daybook_tasks")
    .select("id, title, status, created_at, completed_at")
    .order("created_at", { ascending: true });

  const migrationMissing =
    !!error && /daybook_tasks|schema cache|does not exist/i.test(error.message);

  const { open, doneToday, history } = groupTasks((data ?? []) as TaskRow[], new Date());

  return (
    <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-12 pb-8">
      <h1 className="font-display text-[1.9rem] lg:text-[2.15rem] font-semibold tracking-tight text-ondark">Daybook</h1>
      <p className="text-sm text-slate-400">
        Speak today&apos;s tasks — unfinished ones follow you to tomorrow.
      </p>

      <div className="mt-5">
        {migrationMissing ? (
          <Card>
            <p className="text-sm font-semibold text-amber-300">One-time setup needed</p>
            <p className="mt-1 text-sm text-slate-400">
              The daybook table isn&apos;t in the database yet. Apply migration{" "}
              <code className="text-slate-200">0017_daybook_tasks.sql</code> in the Supabase SQL
              editor, then reload this page.
            </p>
          </Card>
        ) : !isOwner ? (
          <Card>
            <p className="text-sm text-slate-400">
              The daybook is the owner&apos;s task list. Ask the owner for access.
            </p>
          </Card>
        ) : (
          <TaskList open={open} doneToday={doneToday} history={history} />
        )}
      </div>
    </div>
  );
}
