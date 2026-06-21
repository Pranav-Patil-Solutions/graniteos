import { requireSession } from "@/lib/auth";
import VoiceNotes from "@/components/voice/VoiceNotes";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  await requireSession();
  return (
    <div className="px-4 pt-12 pb-8 max-w-md lg:max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="font-display text-[1.9rem] lg:text-[2.15rem] font-semibold tracking-tight text-ondark">Voice Notes</h1>
        <p className="text-sm text-slate-400">
          Quick spoken reminders — Hindi or English, saved on this device.
        </p>
      </div>
      <VoiceNotes />
    </div>
  );
}
