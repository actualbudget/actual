import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

import { FeatureErrorFallback } from '#components/FeatureErrorFallback';
import { Page } from '#components/Page';

import { ChangeLog } from './ChangeLog';

export function ChangeLogPage() {
  const { t } = useTranslation();

  return (
    <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
      <Page header={t('Transaction Changes')}>
        <ChangeLog />
      </Page>
    </ErrorBoundary>
  );
}
