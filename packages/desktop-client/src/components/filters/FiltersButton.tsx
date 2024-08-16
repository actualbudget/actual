import React from 'react';
import { useTranslation } from 'react-i18next';

import { SvgFilter } from '../../icons/v1/Filter';
import { Button } from '../common/Button';

export function FiltersButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();

  return (
    <Button type="bare" onClick={onClick} title={t("Filters")}>
      <SvgFilter style={{ width: 12, height: 12, marginRight: 5 }} /> Filter
    </Button>
  );
}
