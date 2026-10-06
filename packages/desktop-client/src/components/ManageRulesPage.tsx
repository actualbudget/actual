import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

import { FeatureErrorFallback } from '#components/FeatureErrorFallback';
import { useIsSettingsSubPage } from '#components/settings/SettingsSubPageContext';

import { ManageRules } from './ManageRules';
import { Page } from './Page';

export function ManageRulesPage() {
  const isSettingsSubPage = useIsSettingsSubPage();
  const { t } = useTranslation();
  return (
    <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
      <Page
        header={isSettingsSubPage ? null : t('Rules')}
        padding={isSettingsSubPage ? 0 : undefined}
      >
        <ManageRules isModal={false} payeeId={null} />
      </Page>
    </ErrorBoundary>
  );
}
