import type { ReactNode } from 'react';
import { PrimaryButton } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 28, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', minHeight: 110 }}>
      {children}
    </div>
  );
}

export const AddSlab = () => (
  <Shell>
    <PrimaryButton onClick={() => {}}>Add slab</PrimaryButton>
  </Shell>
);

export const GenerateInvoice = () => (
  <Shell>
    <PrimaryButton onClick={() => {}}>Generate invoice</PrimaryButton>
  </Shell>
);

export const RecordPayment = () => (
  <Shell>
    <PrimaryButton href="/payments/new">Record payment</PrimaryButton>
  </Shell>
);

export const ShareQuoteLink = () => (
  <Shell>
    <PrimaryButton href="/quotes/share">Share quote</PrimaryButton>
  </Shell>
);

export const DisabledState = () => (
  <Shell>
    <PrimaryButton disabled onClick={() => {}}>Add slab</PrimaryButton>
  </Shell>
);
