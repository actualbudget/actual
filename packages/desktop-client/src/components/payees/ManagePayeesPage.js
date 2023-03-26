import React from 'react';
import { useLocation } from 'react-router';

import { Page } from '../Page';

import ManagePayeesWithData from './ManagePayeesWithData';

export function ManagePayeesPage() {
  let location = useLocation();
  return (
    <Page title="Payees">
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
