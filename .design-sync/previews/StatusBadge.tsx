import type { ReactNode } from 'react';
import { StatusBadge } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 28, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', minHeight: 100 }}>
      {children}
    </div>
  );
}

export const PaidBadge = () => (
  <Shell>
    <StatusBadge variant="paid" />
  </Shell>
);

export const PendingBadge = () => (
  <Shell>
    <StatusBadge variant="pending" />
  </Shell>
);

export const OverdueBadge = () => (
  <Shell>
    <StatusBadge variant="overdue" />
  </Shell>
);

export const PartialBadge = () => (
  <Shell>
    <StatusBadge variant="partial" />
  </Shell>
);

export const InfoBadge = () => (
  <Shell>
    <StatusBadge variant="info">In Production</StatusBadge>
  </Shell>
);

export const AllVariants = () => (
  <Shell>
    <StatusBadge variant="paid" />
    <StatusBadge variant="pending" />
    <StatusBadge variant="overdue" />
    <StatusBadge variant="partial" />
    <StatusBadge variant="info">Quoted</StatusBadge>
  </Shell>
);
