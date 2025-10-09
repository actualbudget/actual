import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';

import { useNavigableFocusFunction } from '@desktop-client/components/NavigableFocusProvider';
import { useNavigate } from '@desktop-client/hooks/useNavigate';

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
  const focusInput = useNavigableFocusFunction();
  const navigate = useNavigate();

  return (
    <Button
      variant="bare"
      aria-label={t('Add transaction')}
      style={{ margin: 10 }}
      onPress={() => {
        focusInput({ inputmode: 'decimal' });
        navigate(to, { state: { accountId, categoryId } });
      }}
    >
      <SvgAdd width={20} height={20} />
    </Button>
  );
}
