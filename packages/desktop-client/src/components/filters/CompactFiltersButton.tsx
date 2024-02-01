// @ts-strict-ignore
import React from 'react';

import { SvgFilter } from '../../icons/v1';
import { Button } from '../common/Button';

type CompactFiltersButtonProps = {
  onClick: (newValue) => void;
};

export function CompactFiltersButton({ onClick }: CompactFiltersButtonProps) {
  return (
    <Button type="bare" onClick={onClick}>
      <SvgFilter width={15} height={15} />
    </Button>
  );
}
