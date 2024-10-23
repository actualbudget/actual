import React from 'react';

import { SvgFilter } from '../../icons/v1';
import { Button } from '../common/Button2';

export function CompactFiltersButton({ onPress }: { onPress: () => void }) {
  return (
    <Button variant="bare" onPress={onPress} style={{ minWidth: 20 }}>
      <SvgFilter
        width={15}
        height={15}
        style={{ width: 15, height: 15, flexShrink: 0 }}
      />
    </Button>
  );
}
