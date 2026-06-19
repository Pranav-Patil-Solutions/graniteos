import type { ReactNode } from 'react';
import { GhostButton } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 28, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', minHeight: 110 }}>
      {children}
    </div>
  );
}

export const ViewCatalogue = () => (
  <Shell>
    <GhostButton onClick={() => {}}>View catalogue</GhostButton>
  </Shell>
);

export const ShareQuote = () => (
  <Shell>
    <GhostButton onClick={() => {}}>Share quote</GhostButton>
  </Shell>
);

export const CatalogueLink = () => (
  <Shell>
    <GhostButton href="/catalogue">View catalogue</GhostButton>
  </Shell>
);

export const DisabledGhost = () => (
  <Shell>
    <GhostButton disabled onClick={() => {}}>Share quote</GhostButton>
  </Shell>
);
