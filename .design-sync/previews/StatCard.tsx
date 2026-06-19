import type { ReactNode } from 'react';
import { StatCard } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 28, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', minHeight: 120 }}>
      {children}
    </div>
  );
}

export const MonthlyRevenue = () => (
  <Shell>
    <div style={{ minWidth: 180 }}>
      <StatCard label="Monthly Revenue" value={1860000} />
    </div>
  </Shell>
);

export const GoldHighlight = () => (
  <Shell>
    <div style={{ minWidth: 180 }}>
      <StatCard label="Outstanding Dues" value={245000} gold hint="3 parties pending" />
    </div>
  </Shell>
);

export const SlabsPolished = () => (
  <Shell>
    <div style={{ minWidth: 180 }}>
      <StatCard label="Slabs Polished" value={487} prefix="" hint="↑ 12 since yesterday" />
    </div>
  </Shell>
);

export const AvgPricePerSqft = () => (
  <Shell>
    <div style={{ minWidth: 180 }}>
      <StatCard label="Avg Price / sq ft" value={1250} />
    </div>
  </Shell>
);
