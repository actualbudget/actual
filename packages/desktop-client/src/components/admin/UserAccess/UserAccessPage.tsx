import React from 'react';

import { Page } from '../../Page';

import { UserAccess } from './UserAccess';

export function UserAccessPage() {
  return (
    <Page
      header="User Access"
      style={{
        borderRadius: '5px',
        marginBottom: '25px',
      }}
    >
      <UserAccess isModal={false} />
    </Page>
  );
}
