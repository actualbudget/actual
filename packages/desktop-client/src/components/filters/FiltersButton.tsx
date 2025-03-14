import React from 'react';

import { Button } from '@actual-app/components/button';
import { SvgFilter } from '@actual-app/components/icons/v1';

export function FiltersButton({ onPress }: { onPress: () => void }) {
  return (
    <Button variant="bare" onPress={onPress}>
      <SvgFilter
        style={{ width: 12, height: 12, marginRight: 5, flexShrink: 0 }}
      />{' '}
      Filter
    </Button>
  );
}
