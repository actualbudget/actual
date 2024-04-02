import React, { type ComponentPropsWithoutRef } from 'react';

import { useNavigate } from '../../../hooks/useNavigate';
import { SvgAdd } from '../../../icons/v1';
import { theme } from '../../../style';
import { ButtonLink } from '../../common/ButtonLink';

type AddTransactionButtonProps = {
  to: ComponentPropsWithoutRef<typeof ButtonLink>['to'];
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
    <ButtonLink
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
    </ButtonLink>
  );
}
