import React from 'react';
import { useTranslation } from 'react-i18next';

import { Page } from '../../Page';

import { UserAccess } from './UserAccess';

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
