import React, { type ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { View } from '@actual-app/components/view';

import { UserDirectory } from './UserDirectory';

import { Page } from '@desktop-client/components/Page';
import { useNavigate } from '@desktop-client/hooks/useNavigate';

export function UserDirectoryPage({
  bottomContent,
}: {
  bottomContent?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <Page
      header={t('User Directory')}
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
      <Trans>Back to file list</Trans>
    </Button>
  );
}
