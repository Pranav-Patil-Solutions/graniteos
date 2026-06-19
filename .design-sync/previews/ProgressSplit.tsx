import type { ReactNode } from 'react';
import { ProgressSplit } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 28, display: 'flex', flexDirection: 'column', gap: 24, minHeight: 100, width: 340 }}>
      {children}
    </div>
  );
}

// Values are in paise (1 INR = 100 paise)
// ₹1,20,000 = 12000000 paise, ₹80,000 = 8000000 paise

export const MostlyCollected = () => (
  <Shell>
    <ProgressSplit
      collectedPaise={12000000}
      receivablePaise={3000000}
    />
  </Shell>
);

export const HalfCollected = () => (
  <Shell>
    <ProgressSplit
      collectedPaise={7500000}
      receivablePaise={7500000}
    />
  </Shell>
);

export const SmallAdvance = () => (
  <Shell>
    <ProgressSplit
      collectedPaise={2500000}
      receivablePaise={22500000}
    />
  </Shell>
);

export const FullyCollected = () => (
  <Shell>
    <ProgressSplit
      collectedPaise={24500000}
      receivablePaise={0}
    />
  </Shell>
);
