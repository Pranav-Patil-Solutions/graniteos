import type { ReactNode } from 'react';
import { TiltCard } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 24, minHeight: 120 }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>{children}</div>
    </div>
  );
}

export const RevenueKPI = () => (
  <Shell>
    <TiltCard wow>
      <p style={{ fontSize: 11, color: '#9aa1a9', marginBottom: 4 }}>Monthly Revenue</p>
      <p style={{ fontSize: 28, fontWeight: 700, color: '#c8a24b', letterSpacing: '-0.5px' }}>₹4,82,000</p>
      <p style={{ fontSize: 12, color: '#5fce7f', marginTop: 4 }}>↑ 18% vs last month</p>
    </TiltCard>
  </Shell>
);

export const SlabStoneCard = () => (
  <Shell>
    <TiltCard>
      <p style={{ fontSize: 12, color: '#9aa1a9', marginBottom: 6 }}>Black Galaxy · Premium</p>
      <p style={{ fontSize: 20, fontWeight: 700, color: '#f2f0eb' }}>₹1,250 <span style={{ fontSize: 12, fontWeight: 400 }}>/sqft</span></p>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
        <span style={{ fontSize: 11, color: '#9aa1a9' }}>Stock</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#f2f0eb' }}>128 sqft</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: '#9aa1a9' }}>Block #</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#f2f0eb' }}>BG-1042</span>
      </div>
    </TiltCard>
  </Shell>
);

export const ActiveOrdersKPI = () => (
  <Shell>
    <TiltCard>
      <p style={{ fontSize: 11, color: '#9aa1a9', marginBottom: 4 }}>Active Orders</p>
      <p style={{ fontSize: 28, fontWeight: 700, color: '#f2f0eb' }}>12</p>
      <p style={{ fontSize: 12, color: '#9aa1a9', marginTop: 4 }}>3 pending dispatch</p>
    </TiltCard>
  </Shell>
);

export const RecoveryRateCard = () => (
  <Shell>
    <TiltCard wow>
      <p style={{ fontSize: 11, color: '#9aa1a9', marginBottom: 4 }}>Recovery Rate</p>
      <p style={{ fontSize: 28, fontWeight: 700, color: '#c8a24b' }}>84%</p>
      <p style={{ fontSize: 12, color: '#9aa1a9', marginTop: 4 }}>Industry avg: 71%</p>
    </TiltCard>
  </Shell>
);
