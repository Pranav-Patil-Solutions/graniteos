"use client";

import dynamic from "next/dynamic";

// Client wrapper so server components can embed the WebGL viewer with ssr:false.
const SlabViewer = dynamic(() => import("@/components/three/SlabViewer"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center text-graphite-500 text-xs">
      Loading 3D…
    </div>
  ),
});

export default function Slab3D(props: { material?: string; color?: string; className?: string }) {
  return <SlabViewer {...props} />;
}
