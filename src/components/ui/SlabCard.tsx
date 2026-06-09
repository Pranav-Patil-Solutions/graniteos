// SlabCard — a white "polished marble" card floating on the dark shell. Used for
// documents / ledgers / builders. On-light text inside. Redesign spec §3.3.

export function SlabCard({
  children,
  className = "",
  muted = false,
}: {
  children: React.ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl ${muted ? "bg-slab-muted" : "bg-slab"} text-onlight shadow-slab ${className}`}
    >
      {children}
    </div>
  );
}

/** A section inside a SlabCard with the light-muted background. */
export function SlabSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-slab-muted ${className}`}>{children}</div>;
}
