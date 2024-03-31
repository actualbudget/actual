import React, { type ComponentPropsWithoutRef } from 'react';

import { SvgAdd } from '../../../icons/v1';
import { theme } from '../../../style';
import { ButtonLink } from '../../common/ButtonLink';

type AddTransactionButtonProps = {
  to: ComponentPropsWithoutRef<typeof ButtonLink>['to'];
  state?: ComponentPropsWithoutRef<typeof ButtonLink>['state'];
};

export function AddTransactionButton({
  to = '/transactions/new',
  state,
}: AddTransactionButtonProps) {
  return (
    <ButtonLink
      to={to}
      state={state}
      type="bare"
      aria-label="Add Transaction"
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
    >
      <SvgAdd width={20} height={20} />
    </ButtonLink>
  );
}
