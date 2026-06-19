import type { ReactNode } from 'react';
import { FilterChip, FilterChipsRow } from 'graniteos';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'rgb(11 14 17)', padding: 28, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', minHeight: 100, width: '100%' }}>
      {children}
    </div>
  );
}

export const InventoryFilters = () => (
  <Shell>
    <FilterChipsRow>
      <FilterChip label="Material" options={['Granite', 'Marble', 'Quartz']} value="Granite" onChange={() => {}} />
      <FilterChip label="Color" options={['Black', 'White', 'Grey', 'Beige']} value="" onChange={() => {}} />
      <FilterChip label="Stock" options={['In stock', 'Low stock', 'Out of stock']} value="" onChange={() => {}} />
    </FilterChipsRow>
  </Shell>
);

export const OrderFilters = () => (
  <Shell>
    <FilterChipsRow>
      <FilterChip label="Status" options={['Quoted', 'In Production', 'Polishing', 'Dispatched', 'Delivered']} value="In Production" onChange={() => {}} />
      <FilterChip label="Role" options={['Owner', 'Sales Manager', 'Fabricator']} value="" onChange={() => {}} />
    </FilterChipsRow>
  </Shell>
);

export const AllInactive = () => (
  <Shell>
    <FilterChipsRow>
      <FilterChip label="All" options={['Granite', 'Marble', 'Quartz', 'Sandstone']} value="" onChange={() => {}} />
      <FilterChip label="Size" options={['Small', 'Medium', 'Large', 'Extra Large']} value="" onChange={() => {}} />
      <FilterChip label="Finish" options={['Polished', 'Honed', 'Brushed', 'Flamed']} value="" onChange={() => {}} />
    </FilterChipsRow>
  </Shell>
);
