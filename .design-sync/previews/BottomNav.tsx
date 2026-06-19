import type { ReactNode } from 'react';
import { BottomNav } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 0, minHeight: 80, position: 'relative' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', position: 'relative', height: 80 }}>
        {children}
      </div>
    </div>
  );
}

// BottomNav uses `fixed` positioning — render it in a relative-position container
// that gives the preview panel a tall enough shell to show the bar.
export const DefaultNav = () => (
  <div style={{ background: 'rgb(11 14 17)', minHeight: 90, position: 'relative', overflow: 'hidden' }}>
    <div style={{ maxWidth: 420, margin: '0 auto', height: 90, position: 'relative' }}>
      <BottomNav />
    </div>
  </div>
);

export const WithAddHandler = () => (
  <div style={{ background: 'rgb(11 14 17)', minHeight: 90, position: 'relative', overflow: 'hidden' }}>
    <div style={{ maxWidth: 420, margin: '0 auto', height: 90, position: 'relative' }}>
      <BottomNav onAdd={() => {}} />
    </div>
  </div>
);
