import React from 'react';

import { Filter } from '../../icons/v1';
import Button from '../common/Button';
import View from '../common/View';

type CompactFiltersButtonProps = {
  onClick: (newValue) => void;
};

function CompactFiltersButton({ onClick }: CompactFiltersButtonProps) {
  return (
    <View>
      <Button type="bare" onClick={onClick}>
        <Filter width={15} height={15} />
      </Button>
    </View>
  );
}

export default CompactFiltersButton;
