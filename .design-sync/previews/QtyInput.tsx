import type { ReactNode } from 'react';
import { QtyInput } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 28, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', minHeight: 110 }}>
      {children}
    </div>
  );
}

export const SlabQuantity = () => (
  <Shell>
    <div style={{ minWidth: 200 }}>
      <QtyInput label="Slab quantity" value="48" onChange={() => {}} unit="sq ft" />
    </div>
  </Shell>
);

export const PieceCount = () => (
  <Shell>
    <div style={{ minWidth: 200 }}>
      <QtyInput label="No. of pieces" value="12" onChange={() => {}} unit="pieces" />
    </div>
  </Shell>
);

export const PolishedArea = () => (
  <Shell>
    <div style={{ minWidth: 200 }}>
      <QtyInput label="Polished area" value="320" onChange={() => {}} unit="sq ft" />
    </div>
  </Shell>
);

export const EmptyQty = () => (
  <Shell>
    <div style={{ minWidth: 200 }}>
      <QtyInput label="Cut quantity" value="" onChange={() => {}} placeholder="0" unit="sq ft" />
    </div>
  </Shell>
);
