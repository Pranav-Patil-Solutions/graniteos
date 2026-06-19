import type { ReactNode } from 'react';
import { TrendChart } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 24, minHeight: 240 }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>{children}</div>
    </div>
  );
}

// TrendPoint = { label: string; value: number } where value is in paise (1 INR = 100 paise)
const revenueData = [
  { label: 'Dec', value: 28500000 },  // ₹2,85,000
  { label: 'Jan', value: 31200000 },  // ₹3,12,000
  { label: 'Feb', value: 27800000 },  // ₹2,78,000
  { label: 'Mar', value: 39600000 },  // ₹3,96,000
  { label: 'Apr', value: 44100000 },  // ₹4,41,000
  { label: 'May', value: 41800000 },  // ₹4,18,000
  { label: 'Jun', value: 48200000 },  // ₹4,82,000
];

const dispatchData = [
  { label: 'Dec', value: 1800000 },
  { label: 'Jan', value: 2200000 },
  { label: 'Feb', value: 1500000 },
  { label: 'Mar', value: 2800000 },
  { label: 'Apr', value: 3100000 },
  { label: 'May', value: 2600000 },
  { label: 'Jun', value: 3400000 },
];

export const RevenueChart = () => (
  <Shell>
    <TrendChart
      title="Revenue"
      data={revenueData}
      ranges={['6 Months', '3 Months', '1 Month']}
    />
  </Shell>
);

export const DispatchValueChart = () => (
  <Shell>
    <TrendChart
      title="Dispatch Value"
      data={dispatchData}
    />
  </Shell>
);
