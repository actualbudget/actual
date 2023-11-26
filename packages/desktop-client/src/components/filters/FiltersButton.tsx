import React from 'react';

import { SettingsSliderAlternate } from '../../icons/v2';
import Button from '../common/Button';
import View from '../common/View';

type FiltersButtonProps = {
  onClick: (newValue) => void;
};

function FiltersButton({ onClick }: FiltersButtonProps) {
  return (
    <View>
      <Button type="bare" onClick={onClick} title={'Filters'}>
        <SettingsSliderAlternate
          style={{ width: 16, height: 16, marginRight: 5 }}
        />{' '}
        Filter
      </Button>
    </View>
  );
}

export default FiltersButton;
