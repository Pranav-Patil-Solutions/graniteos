import type { ReactNode } from 'react';
import { StoneCard } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 28, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start', minHeight: 120 }}>
      {children}
    </div>
  );
}

const GraniteSwatch = () => (
  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a2e 100%)' }} />
);

const MarbleSwatch = () => (
  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, #f5f5f0 0%, #e8e4dc 30%, #f0ece3 60%, #dcd8cf 100%)' }} />
);

const BrownSwatch = () => (
  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(140deg, #5c3d2e 0%, #8b5e3c 40%, #6b4226 70%, #3d2314 100%)' }} />
);

export const WithFallbackGranite = () => (
  <Shell>
    <div style={{ width: 200 }}>
      <StoneCard
        href="/catalogue/black-galaxy"
        fallback={<GraniteSwatch />}
        name="Black Galaxy"
        meta="Polished · 18mm"
        price="₹1,250 / sq ft"
      />
    </div>
  </Shell>
);

export const WithFallbackWhite = () => (
  <Shell>
    <div style={{ width: 200 }}>
      <StoneCard
        href="/catalogue/alaska-white"
        fallback={<MarbleSwatch />}
        name="Alaska White"
        meta="Honed · 20mm"
        price="₹980 / sq ft"
      />
    </div>
  </Shell>
);

export const WithAREnabled = () => (
  <Shell>
    <div style={{ width: 200 }}>
      <StoneCard
        href="/catalogue/steel-grey"
        fallback={<BrownSwatch />}
        name="Tan Brown"
        meta="Polished · 18mm"
        price="₹1,100 / sq ft"
        arGlb="/models/tan-brown.glb"
      />
    </div>
  </Shell>
);

export const Minimal = () => (
  <Shell>
    <div style={{ width: 200 }}>
      <StoneCard
        href="/catalogue/carrara-white"
        fallback={<MarbleSwatch />}
        name="Carrara White"
      />
    </div>
  </Shell>
);
