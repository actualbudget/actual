import React from 'react';

import { SvgFilter } from '../../icons/v1/Filter';
import { Button } from '../common/Button2';

export function FiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="bare" onPress={onClick}>
      <SvgFilter style={{ width: 12, height: 12, marginRight: 5 }} /> Filter
    </Button>
  );
}
