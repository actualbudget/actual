import React from 'react';

import { SvgSettingsSliderAlternate } from '../../icons/v2';
import { Button } from '../common/Button';

export function FiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="bare" onClick={onClick} title="Filters">
      <SvgSettingsSliderAlternate
        style={{ width: 16, height: 16, marginRight: 5 }}
      />{' '}
      Filter
    </Button>
  );
}
