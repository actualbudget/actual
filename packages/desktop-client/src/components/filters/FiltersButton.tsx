import React from 'react';

import { SvgFilter } from '../../icons/v1/Filter';
import { Button } from '../common/Button';

export function FiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="bare" onClick={onClick} title="Filters">
      <SvgFilter style={{ width: 12, height: 12, marginRight: 5 }} /> Filter
    </Button>
  );
}
