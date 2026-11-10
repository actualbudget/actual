import type { CSSProperties } from '@actual-app/components/styles';

export const LINKED_ACCOUNTS_GRID_COLUMNS =
  'minmax(0, 3fr) minmax(0, 3fr) minmax(0, 2fr) max-content';
export const UNLINKED_ACCOUNTS_GRID_COLUMNS = 'minmax(0, 1fr) max-content';

export const accountsSubgridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'subgrid',
  gridColumn: '1 / -1',
};
