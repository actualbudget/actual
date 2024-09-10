import React from 'react';

import { css } from 'glamor';

import { useNavigate } from '../../../hooks/useNavigate';
import { SvgAdd } from '../../../icons/v1';
import { theme } from '../../../style';
import { Button } from '../../common/Button2';

type AddTransactionButtonProps = {
  to: string;
  accountId?: string;
  categoryId?: string;
};

export function AddTransactionButton({
  to = '/transactions/new',
  accountId,
  categoryId,
}: AddTransactionButtonProps) {
  const navigate = useNavigate();
  return (
    <Button
      variant="bare"
      aria-label="Add transaction"
      className={String(
        css({
          justifyContent: 'center',
          color: theme.mobileHeaderText,
          margin: 10,
          ':hover': {
            color: theme.mobileHeaderText,
            background: theme.mobileHeaderTextHover,
          },
        }),
      )}
      onPress={() => {
        navigate(to, { state: { accountId, categoryId } });
      }}
    >
      <SvgAdd width={20} height={20} />
    </Button>
  );
}
