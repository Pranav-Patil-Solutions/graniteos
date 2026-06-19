import type { ReactNode } from 'react';
import { SlabCard } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 28, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start', minHeight: 120 }}>
      {children}
    </div>
  );
}

export const Default = () => (
  <Shell>
    <SlabCard className="p-4 min-w-[260px]">
      <p style={{ color: '#111827', fontWeight: 700, fontSize: 15, margin: 0 }}>Order #GOS-2847</p>
      <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Black Galaxy · 48 sq ft · Polished</p>
      <p style={{ color: '#374151', fontSize: 13, fontWeight: 600, margin: '8px 0 0' }}>₹60,000</p>
    </SlabCard>
  </Shell>
);

export const MutedVariant = () => (
  <Shell>
    <SlabCard muted className="p-4 min-w-[260px]">
      <p style={{ color: '#374151', fontWeight: 700, fontSize: 14, margin: 0 }}>Invoice INV-0391</p>
      <p style={{ color: '#6b7280', fontSize: 12, margin: '4px 0 0' }}>Alaska White · Fabricator: Ramesh & Sons</p>
      <p style={{ color: '#9ca3af', fontSize: 12, margin: '4px 0 0' }}>Due 25 Jun 2026</p>
    </SlabCard>
  </Shell>
);

export const WithFinancialData = () => (
  <Shell>
    <SlabCard className="p-4 min-w-[280px]">
      <p style={{ color: '#111827', fontWeight: 700, fontSize: 14, margin: '0 0 10px' }}>GST Summary — June 2026</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: '#6b7280', fontSize: 12 }}>Taxable Value</span>
        <span style={{ color: '#111827', fontSize: 12, fontWeight: 600 }}>₹2,45,000</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: '#6b7280', fontSize: 12 }}>CGST 9%</span>
        <span style={{ color: '#111827', fontSize: 12 }}>₹22,050</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#6b7280', fontSize: 12 }}>SGST 9%</span>
        <span style={{ color: '#111827', fontSize: 12 }}>₹22,050</span>
      </div>
    </SlabCard>
  </Shell>
);
