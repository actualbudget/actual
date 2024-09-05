import React, { type ReactNode } from 'react';

import { useNavigate } from '../../../hooks/useNavigate';
import { Button } from '../../common/Button2';
import { View } from '../../common/View';
import { Page } from '../../Page';

import { UserDirectory } from './UserDirectory';

export function UserDirectoryPage({
  bottomContent,
}: {
  bottomContent?: ReactNode;
}) {
  return (
    <Page
      header="User Directory"
      style={{
        borderRadius: '5px',
        marginBottom: '25px',
      }}
    >
      <UserDirectory isModal={false} />
      <View
        style={{
          flexGrow: 1,
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          marginBottom: 15,
        }}
      >
        {bottomContent}
      </View>
    </Page>
  );
}

export function BackToFileListButton() {
  const navigate = useNavigate();

  return (
    <Button style={{ maxWidth: '200px' }} onPress={() => navigate('/')}>
      Back to file list
    </Button>
  );
}
