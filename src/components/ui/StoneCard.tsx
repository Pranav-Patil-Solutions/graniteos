// StoneCard — catalogue card. Full-bleed 4:3 stone photo, name on a gradient
// scrim bottom-left, caption meta, optional AR ghost button. Spec §3.12.
import Link from "next/link";
import { GhostButton } from "./StoneButton";

export function StoneCard({
  href,
  photo,
  fallback,
  name,
  meta,
  price,
  arGlb,
}: {
  href: string;
  photo?: string | null;
  fallback?: React.ReactNode; // swatch when no photo
  name: string;
  meta?: string; // "Polished · 18mm"
  price?: string; // "₹235 / sq ft" — owner-controlled visibility
  arGlb?: string | null;
}) {
  return (
    <div className="rounded-2xl overflow-hidden border border-line-dark bg-shell-elevated shadow-slab">
      <Link href={href} className="block relative aspect-[4/3] group">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0">{fallback}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute left-3 right-3 bottom-2.5">
          <p className="text-white font-bold text-sm leading-tight drop-shadow truncate">{name}</p>
          {meta && <p className="text-white/80 text-[11px] tnum">{meta}</p>}
          {price && <p className="text-gold-soft text-[11px] font-semibold tnum mt-0.5">{price}</p>}
        </div>
      </Link>
      {arGlb && (
        <div className="p-2.5">
          <GhostButton href={`${href}?ar=1`} className="w-full !min-h-[40px] text-[13px]">
            See in your space (AR)
          </GhostButton>
        </div>
      )}
    </div>
  );
}
