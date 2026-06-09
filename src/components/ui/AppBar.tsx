// AppBar — transparent chrome over the dark shell, 56px. Left: "G" monogram
// (Fraunces gold). Right: bell + menu, or a back arrow + title. Spec §3.1.
import Link from "next/link";
import { Bell, Menu, ChevronLeft } from "lucide-react";

export function AppBar({
  title,
  back,
  onMenu,
}: {
  title?: string;
  back?: string;
  onMenu?: () => void;
}) {
  return (
    <header className="h-14 flex items-center justify-between px-4">
      <div className="flex items-center gap-2 min-w-0">
        {back ? (
          <Link href={back} className="w-9 h-9 -ml-2 grid place-items-center text-ondark-muted hover:text-ondark rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </Link>
        ) : (
          <span className="font-display text-2xl font-semibold text-gold leading-none">G</span>
        )}
        {title && <h1 className="text-base font-bold text-ondark truncate">{title}</h1>}
      </div>
      <div className="flex items-center gap-1">
        <button className="w-9 h-9 grid place-items-center text-ondark-muted hover:text-ondark rounded-lg" aria-label="Alerts">
          <Bell className="w-5 h-5" />
        </button>
        <button onClick={onMenu} className="w-9 h-9 grid place-items-center text-ondark-muted hover:text-ondark rounded-lg" aria-label="Menu">
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
