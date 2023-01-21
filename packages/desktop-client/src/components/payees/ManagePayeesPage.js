import React from 'react';
import { useLocation } from 'react-router';

import ManagePayeesWithData from './ManagePayeesWithData';
import { Page } from '../Page';

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
