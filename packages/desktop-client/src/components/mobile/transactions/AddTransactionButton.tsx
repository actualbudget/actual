import React from 'react';
import { useTranslation } from 'react-i18next';

import { useNavigate } from '../../../hooks/useNavigate';
import { SvgAdd } from '../../../icons/v1';
import { Button } from '../../common/Button2';

type AddTransactionButtonProps = {
  to?: string;
  accountId?: string;
  categoryId?: string;
};

export function AddTransactionButton({
  to = '/transactions/new',
  accountId,
  categoryId,
}: AddTransactionButtonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Button
      variant="bare"
      aria-label={t('Add transaction')}
      style={{ margin: 10 }}
      onPress={() => {
        navigate(to, { state: { accountId, categoryId } });
      }}
    >
      <SvgAdd width={20} height={20} />
    </Button>
  );
}
