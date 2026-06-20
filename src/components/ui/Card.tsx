import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-2xl border border-graphite-600 bg-white/[0.04] backdrop-blur p-4 elev-1 ${className}`}
    >
      {children}
    </div>
  );
}
