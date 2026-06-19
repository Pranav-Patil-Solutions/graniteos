import type { ReactNode } from 'react';
import { RoleBadge } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 28, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', minHeight: 100 }}>
      {children}
    </div>
  );
}

export const OwnerRole = () => (
  <Shell>
    <RoleBadge role="owner" />
  </Shell>
);

export const SalesManagerRole = () => (
  <Shell>
    <RoleBadge role="sales_manager" />
  </Shell>
);

export const StoreManagerRole = () => (
  <Shell>
    <RoleBadge role="store_manager" />
  </Shell>
);

export const FabricationSupervisorRole = () => (
  <Shell>
    <RoleBadge role="fabrication_supervisor" />
  </Shell>
);

export const AllRoles = () => (
  <Shell>
    <RoleBadge role="owner" />
    <RoleBadge role="sales_manager" />
    <RoleBadge role="store_manager" />
    <RoleBadge role="fabrication_supervisor" />
  </Shell>
);
