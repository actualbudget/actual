import React from 'react';

import { SvgFilter } from '../../icons/v1';
import { Button } from '../common/Button';

export function CompactFiltersButton({
  onClick,
}: {
  onClick: (newValue) => void;
}) {
  return (
    <Button type="bare" onClick={onClick}>
      <SvgFilter width={15} height={15} />
    </Button>
  );
}
