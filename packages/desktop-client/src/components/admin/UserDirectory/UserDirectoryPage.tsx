import React from 'react';

import { Page } from '../../Page';

import { UserDirectory } from './UserDirectory';

export function UserDirectoryPage() {
  return (
    <Page
      header="User Directory"
      style={{
        borderRadius: '5px',
        marginBottom: '25px',
      }}
    >
      <UserDirectory isModal={false} />
    </Page>
  );
}
