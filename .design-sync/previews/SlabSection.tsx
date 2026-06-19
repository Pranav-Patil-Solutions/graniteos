import type { ReactNode } from 'react';
import { SlabCard, SlabSection } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 28, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start', minHeight: 120 }}>
      {children}
    </div>
  );
}

export const LineItems = () => (
  <Shell>
    <SlabCard className="p-4 min-w-[280px]">
      <p style={{ color: '#111827', fontWeight: 700, fontSize: 14, margin: '0 0 10px' }}>Order #GOS-2847</p>
      <SlabSection className="p-3">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: '#374151', fontSize: 12 }}>Black Galaxy 18mm</span>
          <span style={{ color: '#111827', fontSize: 12, fontWeight: 600 }}>48 sq ft</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#374151', fontSize: 12 }}>Steel Grey 20mm</span>
          <span style={{ color: '#111827', fontSize: 12, fontWeight: 600 }}>32 sq ft</span>
        </div>
      </SlabSection>
    </SlabCard>
  </Shell>
);

export const SummaryBlock = () => (
  <Shell>
    <SlabCard className="p-4 min-w-[260px]">
      <p style={{ color: '#111827', fontWeight: 700, fontSize: 14, margin: '0 0 10px' }}>Dispatch Summary</p>
      <SlabSection className="p-3">
        <p style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Loaded on truck</p>
        <p style={{ color: '#111827', fontSize: 20, fontWeight: 800, margin: 0 }}>18 slabs</p>
        <p style={{ color: '#9ca3af', fontSize: 12, margin: '2px 0 0' }}>Alaska White · Carrara White</p>
      </SlabSection>
    </SlabCard>
  </Shell>
);

export const MeasurementBlock = () => (
  <Shell>
    <SlabCard className="p-4 min-w-[280px]">
      <p style={{ color: '#111827', fontWeight: 700, fontSize: 14, margin: '0 0 10px' }}>BLK-104 Measurement Sheet</p>
      <SlabSection className="p-3">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: '#6b7280', fontSize: 12 }}>Total slabs</span>
          <span style={{ color: '#111827', fontSize: 12, fontWeight: 600 }}>24</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: '#6b7280', fontSize: 12 }}>Net area</span>
          <span style={{ color: '#111827', fontSize: 12, fontWeight: 600 }}>312 sq ft</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280', fontSize: 12 }}>Recovery rate</span>
          <span style={{ color: '#111827', fontSize: 12, fontWeight: 600 }}>84%</span>
        </div>
      </SlabSection>
    </SlabCard>
  </Shell>
);
