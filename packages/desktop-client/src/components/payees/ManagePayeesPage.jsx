import React from 'react';
import { useLocation } from 'react-router-dom';

import { useResponsive } from '../../ResponsiveProvider';
import { theme } from '../../style';
import { Page } from '../Page';

import { ManagePayeesWithData } from './ManagePayeesWithData';

export function ManagePayeesPage() {
  const location = useLocation();
  const { isNarrowWidth } = useResponsive();
  return (
    <Page
      title="Payees"
      titleStyle={{
        ...(isNarrowWidth && {
          backgroundColor: theme.mobileHeaderBackground,
          color: theme.mobileHeaderText,
        }),
      }}
    >
      <ManagePayeesWithData
        initialSelectedIds={
          location.state && location.state.selectedPayee
            ? [location.state.selectedPayee]
            : null
        }
      />
    </Page>
  );
}
