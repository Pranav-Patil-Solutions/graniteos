import type { ReactNode } from 'react';
import { MoneyInput } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 28, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', minHeight: 110 }}>
      {children}
    </div>
  );
}

export const RatePerSqft = () => (
  <Shell>
    <div style={{ minWidth: 200 }}>
      <MoneyInput label="Rate per sq ft" value="1250" onChange={() => {}} placeholder="0" />
    </div>
  </Shell>
);

export const AdvanceAmount = () => (
  <Shell>
    <div style={{ minWidth: 200 }}>
      <MoneyInput label="Advance amount" value="245000" onChange={() => {}} placeholder="0" />
    </div>
  </Shell>
);

export const SlabPrice = () => (
  <Shell>
    <div style={{ minWidth: 200 }}>
      <MoneyInput label="Slab price" value="18500" onChange={() => {}} placeholder="0" />
    </div>
  </Shell>
);

export const EmptyPlaceholder = () => (
  <Shell>
    <div style={{ minWidth: 200 }}>
      <MoneyInput label="Invoice total" value="" onChange={() => {}} placeholder="Enter amount" />
    </div>
  </Shell>
);
