import React from 'react';

import { SvgFilter } from '../../icons/v1';
import { Button } from '../common/Button2';

export function CompactFiltersButton({ onPress }: { onPress: () => void }) {
  return (
    <Button variant="bare" onPress={onPress}>
      <SvgFilter width={15} height={15} />
    </Button>
  );
}
