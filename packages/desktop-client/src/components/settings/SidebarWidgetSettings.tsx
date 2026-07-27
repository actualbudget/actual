import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { Checkbox } from '#components/forms';
import {
  ALL_WIDGET_METRICS,
  widgetMetricLabel,
} from '#components/sidebar/SummaryWidget';
import { useLocalPref } from '#hooks/useLocalPref';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { Setting } from './UI';

export function SidebarWidgetSettings() {
  const { t } = useTranslation();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const [widgetMetricsPref, setWidgetMetricsPref] = useLocalPref(
    'sidebar.widgetMetrics',
  );

  const availableMetrics = ALL_WIDGET_METRICS.filter(
    metric => metric !== 'toBudget' || budgetType === 'envelope',
  );
  const enabledMetrics = widgetMetricsPref ?? availableMetrics;

  const onToggle = (metric: string, checked: boolean) => {
    const current = widgetMetricsPref ?? availableMetrics;
    if (!checked && current.length <= 1) {
      // Always leave at least one metric enabled.
      return;
    }
    setWidgetMetricsPref(
      checked
        ? [...current, metric]
        : current.filter(existing => existing !== metric),
    );
  };

  return (
    <Setting>
      <Text>
        <Trans>
          <strong>Sidebar widget</strong> metrics — choose which ones the
          summary widget at the top of the sidebar cycles through when clicked.
          At least one is always shown.
        </Trans>
      </Text>
      <View style={{ flexDirection: 'column', gap: 6, marginTop: 10 }}>
        {availableMetrics.map(metric => (
          <Text key={metric} style={{ display: 'flex', alignItems: 'center' }}>
            <Checkbox
              id={`settings-widget-metric-${metric}`}
              checked={enabledMetrics.includes(metric)}
              onChange={e => onToggle(metric, e.currentTarget.checked)}
            />
            <label htmlFor={`settings-widget-metric-${metric}`}>
              {widgetMetricLabel(t, metric)}
            </label>
          </Text>
        ))}
      </View>
    </Setting>
  );
}
