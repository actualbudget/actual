import { useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Block } from '@actual-app/components/block';
import { View } from '@actual-app/components/view';

import { LoadingIndicator } from './LoadingIndicator';
import { Overview } from './Overview';

import { useDashboardPages } from '@desktop-client/hooks/useDashboardPages';
import { useNavigate } from '@desktop-client/hooks/useNavigate';

export function ReportsDashboardRouter() {
  const { t } = useTranslation();
  const { dashboardId } = useParams<{ dashboardId?: string }>();
  const navigate = useNavigate();
  const { data: dashboardPages = [], isPending } = useDashboardPages();

  // Redirect to first dashboard if no dashboardId in URL
  useEffect(() => {
    if (!dashboardId && !isPending && dashboardPages.length > 0) {
      void navigate(`/reports/${dashboardPages[0].id}`, { replace: true });
    }
  }, [dashboardId, isPending, dashboardPages, navigate]);

  // Show loading while we're fetching dashboards or redirecting
  if (isPending || (!dashboardId && dashboardPages.length > 0)) {
    return <LoadingIndicator message={t('Loading dashboards...')} />;
  }

  // If we have a dashboardId, render Overview with it
  if (dashboardId) {
    const dashboard = dashboardPages.find(d => d.id === dashboardId);
    if (dashboard) {
      return <Overview dashboard={dashboard} />;
    } else {
      // Invalid dashboardId - show error
      return (
        <View
          style={{
            flex: 1,
            gap: 20,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Block style={{ marginBottom: 20, fontSize: 18 }}>
            <Trans>Dashboard not found</Trans>
          </Block>
        </View>
      );
    }
  }

  // No dashboards exist (NOTE: This should not happen invariant is we always should have at least 1 dashboard)
  return <LoadingIndicator message={t('No dashboards available')} />;
}
