import type { ReactNode } from 'react';
import { AppBar } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 0, minHeight: 56 }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>{children}</div>
    </div>
  );
}

export const HomeScreen = () => (
  <Shell>
    <AppBar />
  </Shell>
);

export const InventoryScreen = () => (
  <Shell>
    <AppBar title="Inventory" />
  </Shell>
);

export const DaybookScreen = () => (
  <Shell>
    <AppBar title="Daybook" />
  </Shell>
);

export const BackNavigation = () => (
  <Shell>
    <AppBar title="Slab Detail" back="/inventory" />
  </Shell>
);

export const TitleOnly = () => (
  <Shell>
    <AppBar title="My Showroom" />
  </Shell>
);
