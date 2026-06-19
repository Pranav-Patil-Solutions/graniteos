import type { ReactNode } from 'react';
import { AnimatedNumber } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 28, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', minHeight: 100 }}>
      {children}
    </div>
  );
}

export const RevenueINR = () => (
  <Shell>
    <AnimatedNumber
      value={245000}
      prefix="₹"
      className="text-3xl font-bold text-white tabular-nums"
    />
  </Shell>
);

export const SlabsInStock = () => (
  <Shell>
    <AnimatedNumber
      value={1248}
      suffix=" slabs"
      className="text-2xl font-semibold text-gold tabular-nums"
    />
  </Shell>
);

export const SquareFeet = () => (
  <Shell>
    <AnimatedNumber
      value={4320}
      suffix=" sq ft"
      className="text-xl font-medium text-ondark-muted tabular-nums"
    />
  </Shell>
);

export const JobsInProgress = () => (
  <Shell>
    <AnimatedNumber
      value={17}
      suffix=" jobs"
      className="text-4xl font-bold text-positive tabular-nums"
    />
  </Shell>
);

export const MonthlyCollection = () => (
  <Shell>
    <AnimatedNumber
      value={875000}
      prefix="₹"
      className="text-2xl font-bold text-gold tabular-nums"
    />
  </Shell>
);
