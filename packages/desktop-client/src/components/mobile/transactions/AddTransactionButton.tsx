import React from 'react';

import { useNavigate } from '../../../hooks/useNavigate';
import { SvgAdd } from '../../../icons/v1';
import { theme } from '../../../style';
import { Button } from '../../common/Button';

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
      type="bare"
      aria-label="Add transaction"
      style={{
        justifyContent: 'center',
        color: theme.mobileHeaderText,
        margin: 10,
      }}
      hoveredStyle={{
        color: theme.mobileHeaderText,
        background: theme.mobileHeaderTextHover,
      }}
      onClick={() => {
        navigate(to, { state: { accountId, categoryId } });
      }}
    >
      <SvgAdd width={20} height={20} />
    </Button>
  );
}
