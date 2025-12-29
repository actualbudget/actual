import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { LoadingIndicator } from './LoadingIndicator';
import { Overview } from './Overview';

import { useDashboardPages } from '@desktop-client/hooks/useDashboard';
import { useNavigate } from '@desktop-client/hooks/useNavigate';

export function ReportsDashboardRouter() {
  const { t } = useTranslation();
  const { dashboardId } = useParams<{ dashboardId?: string }>();
  const navigate = useNavigate();
  const { data: dashboard_pages = [], isLoading } = useDashboardPages();

  // Redirect to first dashboard if no dashboardId in URL
  useEffect(() => {
    if (!dashboardId && !isLoading && dashboard_pages.length > 0) {
      navigate(`/reports/${dashboard_pages[0].id}`, { replace: true });
    }
  }, [dashboardId, isLoading, dashboard_pages, navigate]);

  // Show loading while we're fetching dashboards or redirecting
  if (isLoading || (!dashboardId && dashboard_pages.length > 0)) {
    return <LoadingIndicator />;
  }

  // If we have a dashboardId, render Overview with it
  if (dashboardId) {
    const dashboard = dashboard_pages.find(d => d.id === dashboardId);
    if (dashboard) {
      return <Overview dashboard={dashboard} />;
    }
  }

  // No dashboards exist - show empty state:
  // NOTE: This should not happen
  return <LoadingIndicator message={t('No dashboards available')} />;
}
