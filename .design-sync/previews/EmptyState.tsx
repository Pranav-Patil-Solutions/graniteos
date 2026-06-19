import type { ReactNode } from 'react';
import { EmptyState } from 'graniteos';
import { Package, IndianRupee, Users, ClipboardList } from 'lucide-react';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 24, minHeight: 120 }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>{children}</div>
    </div>
  );
}

export const NoSlabs = () => (
  <Shell>
    <EmptyState
      icon={<Package size={36} />}
      heading="No slabs yet"
      subtext="Add your first block to start tracking inventory and pricing."
      actionLabel="Add first slab"
      actionHref="/inventory/new"
    />
  </Shell>
);

export const NoDaybookEntries = () => (
  <Shell>
    <EmptyState
      icon={<IndianRupee size={36} />}
      heading="No transactions recorded"
      subtext="Record your first payment or sale to see cash flow here."
      actionLabel="Record transaction"
      actionHref="/daybook/new"
    />
  </Shell>
);

export const NoCustomers = () => (
  <Shell>
    <EmptyState
      icon={<Users size={36} />}
      heading="No customers added"
      subtext="Add a customer to track their orders and outstanding balance."
      actionLabel="Add customer"
      actionHref="/parties/new"
    />
  </Shell>
);

export const NoOrders = () => (
  <Shell>
    <EmptyState
      icon={<ClipboardList size={36} />}
      heading="No orders this month"
      subtext="Orders placed from the showroom will appear here once confirmed."
    />
  </Shell>
);
