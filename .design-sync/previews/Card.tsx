import type { ReactNode } from 'react';
import { Card } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 28, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start', minHeight: 120 }}>
      {children}
    </div>
  );
}

export const BasicCard = () => (
  <Shell>
    <Card>
      <p style={{ color: 'white', fontWeight: 600, margin: 0 }}>Black Galaxy</p>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: '4px 0 0' }}>Polished · 18mm · BLK-104</p>
    </Card>
  </Shell>
);

export const CardWithMetaRow = () => (
  <Shell>
    <Card className="min-w-[240px]" >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 48 }}>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Status</span>
        <span style={{ color: '#4ade80', fontSize: 12, fontWeight: 600 }}>In Production</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 48 }}>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Block</span>
        <span style={{ color: 'white', fontSize: 12 }}>BLK-104</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 48 }}>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Thickness</span>
        <span style={{ color: 'white', fontSize: 12 }}>20mm</span>
      </div>
    </Card>
  </Shell>
);

export const CardWithHeading = () => (
  <Shell>
    <Card>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Today's Dispatch</p>
      <p style={{ color: 'white', fontSize: 24, fontWeight: 800, margin: '4px 0 0' }}>12 slabs</p>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '4px 0 0' }}>Steel Grey · Alaska White</p>
    </Card>
  </Shell>
);
