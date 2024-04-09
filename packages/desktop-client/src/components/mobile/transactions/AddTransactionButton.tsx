import React from 'react';

import { useNavigate } from '../../../hooks/useNavigate';
import { SvgAdd } from '../../../icons/v1';
import { theme } from '../../../style';
import { Link } from '../../common/Link';

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
    <Link
      variant="button"
      to={to}
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
      activeStyle={{ background: 'transparent' }}
      onClick={e => {
        e.preventDefault();
        navigate(to, { state: { accountId, categoryId } });
      }}
    >
      <SvgAdd width={20} height={20} />
    </Link>
  );
}
