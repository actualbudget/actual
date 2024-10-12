import React from 'react';

import { SvgFilter } from '../../icons/v1/Filter';
import { Button } from '../common/Button2';

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
