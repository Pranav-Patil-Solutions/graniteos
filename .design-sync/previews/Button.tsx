import type { ReactNode } from 'react';
import { Button } from 'graniteos';

// GraniteOS ships on a dark graphite shell — preview on it so the
// dark-theme tokens (text-white, gold, granite-green) read correctly.
function Shell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: 'rgb(11 14 17)',
        padding: 28,
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        alignItems: 'center',
        minHeight: 120,
      }}
    >
      {children}
    </div>
  );
}

export const Press = () => (
  <Shell>
    <Button variant="press">Add slab</Button>
  </Shell>
);

export const WhatsAppSpring = () => (
  <Shell>
    <Button variant="spring">Share on WhatsApp</Button>
  </Shell>
);

export const GoldOutline = () => (
  <Shell>
    <Button variant="outline">View catalogue</Button>
  </Shell>
);

export const MorphAction = () => (
  <Shell>
    <Button variant="morph" onAction={async () => {}}>
      Save changes
    </Button>
  </Shell>
);
