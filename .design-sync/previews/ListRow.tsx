import type { ReactNode } from 'react';
import { ListRow } from 'graniteos';
import { Package, Layers, IndianRupee, Truck } from 'lucide-react';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 24, minHeight: 120 }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>{children}</div>
    </div>
  );
}

export const SlabInStock = () => (
  <Shell>
    <ListRow
      icon={Package}
      title="Black Galaxy"
      caption="64 sqft · Block #BG-1042"
      value="₹1,250/sqft"
      badge={<span style={{ background: '#166534', color: '#86efac', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>In stock</span>}
    />
  </Shell>
);

export const SlabLowStock = () => (
  <Shell>
    <ListRow
      icon={Layers}
      title="Kashmir White"
      caption="18 sqft · Block #KW-0389"
      value="₹980/sqft"
      valueClass="text-amber-400"
      badge={<span style={{ background: '#78350f', color: '#fcd34d', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>Low</span>}
    />
  </Shell>
);

export const DaybookEntry = () => (
  <Shell>
    <ListRow
      icon={IndianRupee}
      title="Suresh Marbles — Invoice #1084"
      caption="16 Jun 2026 · Granite supply"
      value="₹2,45,000"
      valueClass="text-green-400"
    />
  </Shell>
);

export const DeliveryRow = () => (
  <Shell>
    <ListRow
      icon={Truck}
      title="Dispatch — Anand Stone Works"
      caption="15 Jun 2026 · 3 slabs · Pune"
      value="Delivered"
    />
  </Shell>
);

export const AvatarCustomer = () => (
  <Shell>
    <ListRow
      avatar="RK"
      title="Ramesh Kumar & Sons"
      caption="Bengaluru · 7 orders"
      value="₹8,40,000"
    />
  </Shell>
);
