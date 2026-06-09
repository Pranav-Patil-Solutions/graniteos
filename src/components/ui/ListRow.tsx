// ListRow — 56px min height; leading icon/avatar, title + caption, trailing value
// + optional badge. Divider tone depends on surface. Redesign spec §3.4.
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function ListRow({
  icon: Icon,
  avatar,
  title,
  caption,
  value,
  valueClass = "",
  badge,
  href,
  surface = "dark",
  divider = true,
}: {
  icon?: LucideIcon;
  avatar?: string;
  title: string;
  caption?: string;
  value?: string;
  valueClass?: string;
  badge?: React.ReactNode;
  href?: string;
  surface?: "dark" | "slab";
  divider?: boolean;
}) {
  const onSlab = surface === "slab";
  const inner = (
    <div
      className={`flex items-center gap-3 min-h-[56px] py-2 ${
        divider ? `border-b ${onSlab ? "border-line-light" : "border-line-dark"}` : ""
      }`}
    >
      {avatar ? (
        <span className="w-9 h-9 rounded-full bg-gradient-to-br from-granite-green to-granite-green2 text-white grid place-items-center text-sm font-bold shrink-0">
          {avatar}
        </span>
      ) : Icon ? (
        <span
          className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${
            onSlab ? "bg-black/[0.05] text-onlight-muted" : "bg-white/[0.06] text-ondark-muted"
          }`}
        >
          <Icon className="w-4 h-4" />
        </span>
      ) : null}

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${onSlab ? "text-onlight" : "text-ondark"}`}>{title}</p>
        {caption && (
          <p className={`text-[12px] truncate ${onSlab ? "text-onlight-muted" : "text-ondark-muted"}`}>{caption}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {value && <span className={`text-sm font-semibold tnum ${valueClass || (onSlab ? "text-onlight" : "text-ondark")}`}>{value}</span>}
        {badge}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block active:opacity-70 transition-opacity">
      {inner}
    </Link>
  ) : (
    inner
  );
}
