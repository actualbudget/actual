import React from 'react';

import { SettingsSliderAlternate } from '../../icons/v2';
import { Button } from '../common/Button';

type FiltersButtonProps = {
  onClick: (newValue) => void;
};

function FiltersButton({ onClick }: FiltersButtonProps) {
  return (
    <Button type="bare" onClick={onClick} title="Filters">
      <SettingsSliderAlternate
        style={{ width: 16, height: 16, marginRight: 5 }}
      />{' '}
      Filter
    </Button>
  );
}

export default FiltersButton;
