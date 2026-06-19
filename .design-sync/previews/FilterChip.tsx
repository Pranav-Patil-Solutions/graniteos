import type { ReactNode } from 'react';
import { FilterChip } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 28, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', minHeight: 100 }}>
      {children}
    </div>
  );
}

const STONE_OPTIONS = ['Granite', 'Marble', 'Quartz', 'Sandstone'];
const COLOR_OPTIONS = ['Black', 'White', 'Grey', 'Beige', 'Green'];
const STATUS_OPTIONS = ['In stock', 'Low stock', 'Out of stock'];

export const InactiveChip = () => (
  <Shell>
    <FilterChip
      label="Material"
      options={STONE_OPTIONS}
      value=""
      onChange={() => {}}
    />
  </Shell>
);

export const ActiveChip = () => (
  <Shell>
    <FilterChip
      label="Material"
      options={STONE_OPTIONS}
      value="Granite"
      onChange={() => {}}
    />
  </Shell>
);

export const ColorChip = () => (
  <Shell>
    <FilterChip
      label="Color"
      options={COLOR_OPTIONS}
      value="Black"
      onChange={() => {}}
    />
  </Shell>
);

export const StockChip = () => (
  <Shell>
    <FilterChip
      label="Stock"
      options={STATUS_OPTIONS}
      value=""
      onChange={() => {}}
    />
  </Shell>
);
