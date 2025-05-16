import React from 'react';
import { useTranslation } from 'react-i18next';

import { UserAccess } from './UserAccess';

import { Page } from '@desktop-client/components/Page';

export function UserAccessPage() {
  const { t } = useTranslation();

  return (
    <Page
      header={t('User Access')}
      style={{
        borderRadius: '5px',
        marginBottom: '25px',
      }}
    >
      <UserAccess isModal={false} />
    </Page>
  );
}
