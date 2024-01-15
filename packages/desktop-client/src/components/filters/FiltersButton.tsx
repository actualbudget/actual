// @ts-strict-ignore
import React from 'react';

import { SvgSettingsSliderAlternate } from '../../icons/v2';
import { Button } from '../common/Button';

type FiltersButtonProps = {
  onClick: (newValue) => void;
};

export function FiltersButton({ onClick }: FiltersButtonProps) {
  return (
    <Button type="bare" onClick={onClick} title="Filters">
      <SvgSettingsSliderAlternate
        style={{ width: 16, height: 16, marginRight: 5 }}
      />{' '}
      Filter
    </Button>
  );
}
