import { requireSession } from "@/lib/auth";
import VoiceNotes from "@/components/voice/VoiceNotes";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  await requireSession();
  return (
    <div className="px-4 py-5 max-w-md mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white">Voice Notes</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Quick spoken reminders — Hindi or English, saved on this device.
        </p>
      </div>
      <VoiceNotes />
    </div>
  );
}
