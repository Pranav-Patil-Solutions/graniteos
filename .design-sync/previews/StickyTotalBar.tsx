import type { ReactNode } from 'react';
import { StickyTotalBar } from 'graniteos';

// StickyTotalBar uses `fixed` positioning so we wrap in a tall relative container
// with overflow:hidden so it renders visibly in preview.
function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', minHeight: 100, position: 'relative', overflow: 'hidden' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', position: 'relative', height: 100 }}>
        {children}
      </div>
    </div>
  );
}

export const InvoiceBar = () => (
  <Shell>
    <StickyTotalBar
      label="Invoice Total"
      value="₹2,45,000"
      actionLabel="Generate Invoice"
    />
  </Shell>
);

export const OrderSummaryBar = () => (
  <Shell>
    <StickyTotalBar
      label="Order Total"
      value="₹87,500"
      actionLabel="Confirm Order"
    />
  </Shell>
);

export const DisabledBar = () => (
  <Shell>
    <StickyTotalBar
      label="Estimate Total"
      value="₹0"
      actionLabel="Send Estimate"
      disabled
    />
  </Shell>
);
