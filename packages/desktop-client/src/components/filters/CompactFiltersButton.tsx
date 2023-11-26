import React from 'react';

import { Filter } from '../../icons/v1';
import Button from '../common/Button';

type CompactFiltersButtonProps = {
  onClick: (newValue) => void;
};

function CompactFiltersButton({ onClick }: CompactFiltersButtonProps) {
  return (
    <Button type="bare" onClick={onClick}>
      <Filter width={15} height={15} />
    </Button>
  );
}

export default CompactFiltersButton;
