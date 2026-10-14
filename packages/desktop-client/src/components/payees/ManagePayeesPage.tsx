import React from 'react';
import { useLocation } from 'react-router';

import type { PayeeEntity } from '@actual-app/core/types/models';

import { ManagePayeesWithData } from './ManagePayeesWithData';

export function ManagePayeesPage() {
  const location = useLocation();
  const locationState = location.state;
  const initialSelectedIds =
    locationState && 'selectedPayee' in locationState
      ? [locationState.selectedPayee as PayeeEntity['id']]
      : [];
  return <ManagePayeesWithData initialSelectedIds={initialSelectedIds} />;
}
