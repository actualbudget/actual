import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

import { FeatureErrorFallback } from '#components/FeatureErrorFallback';

import { ManageRules } from './ManageRules';
import { Page } from './Page';

export function ManageRulesPage() {
  const { t } = useTranslation();
  return (
    <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
      <Page header={t('Rules')}>
        <ManageRules isModal={false} payeeId={null} />
      </Page>
    </ErrorBoundary>
  );
}
