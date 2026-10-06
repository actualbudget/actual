import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { FeatureErrorFallback } from '#components/FeatureErrorFallback';

import { ManageRules } from './ManageRules';

export function ManageRulesPage() {
  return (
    <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
      <ManageRules isModal={false} payeeId={null} />
    </ErrorBoundary>
  );
}
