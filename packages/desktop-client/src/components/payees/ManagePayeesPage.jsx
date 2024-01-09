import React from 'react';
import { useLocation } from 'react-router-dom';

import { Page } from '../Page';

import { ManagePayeesWithData } from './ManagePayeesWithData';

export function ManagePayeesPage() {
  const location = useLocation();
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
