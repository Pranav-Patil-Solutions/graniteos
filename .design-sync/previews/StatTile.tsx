import type { ReactNode } from 'react';
import { StatTile } from 'graniteos';
import { Package, TrendingUp, Truck, Layers } from 'lucide-react';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 28, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', minHeight: 120 }}>
      {children}
    </div>
  );
}

export const InProduction = () => (
  <Shell>
    <div style={{ width: 160 }}>
      <StatTile icon={Package} label="Slabs in production" value="142" sub="BLK-104 · BLK-107" />
    </div>
  </Shell>
);

export const RevenueAccent = () => (
  <Shell>
    <div style={{ width: 160 }}>
      <StatTile icon={TrendingUp} label="Revenue this month" value="₹18.6L" accent />
    </div>
  </Shell>
);

export const DispatchedToday = () => (
  <Shell>
    <div style={{ width: 160 }}>
      <StatTile icon={Truck} label="Dispatched today" value="18 slabs" sub="Steel Grey · Alaska White" />
    </div>
  </Shell>
);

export const SlabInventory = () => (
  <Shell>
    <div style={{ width: 160 }}>
      <StatTile icon={Layers} label="Slab inventory" value="384 sq ft" />
    </div>
  </Shell>
);
