import React from 'react';

import { SvgFilter } from '../../icons/v1';
import { Button } from '../common/Button2';

export function CompactFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="bare" onPress={onClick}>
      <SvgFilter width={15} height={15} />
    </Button>
  );
}
