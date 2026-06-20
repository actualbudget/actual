import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Paragraph } from '@actual-app/components/paragraph';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  MonthlyBudgetOverviewPeriod,
  MonthlyBudgetOverviewWidget,
} from '@actual-app/core/types/models';

import { EditablePageHeaderTitle } from '#components/EditablePageHeaderTitle';
import { MobileBackButton } from '#components/mobile/MobileBackButton';
import { MobilePageHeader, Page, PageHeader } from '#components/Page';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { MonthlyBudgetOverviewControls } from '#components/reports/reports/MonthlyBudgetOverviewControls';
import { MonthlyBudgetOverviewSummary } from '#components/reports/reports/MonthlyBudgetOverviewSummary';
import { MonthlyBudgetOverviewTable } from '#components/reports/reports/MonthlyBudgetOverviewTable';
import { useAutomationOverview } from '#hooks/useAutomationOverview';
import { useDashboardWidget } from '#hooks/useDashboardWidget';
import { useLocale } from '#hooks/useLocale';
import { useNavigate } from '#hooks/useNavigate';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import { useUpdateDashboardWidgetMutation } from '#reports/mutations';

import { getMonthlyBudgetOverviewRange } from './monthlyBudgetOverviewPeriods';

export function MonthlyBudgetOverview() {
  const params = useParams();
  const { data: widget, isPending } =
    useDashboardWidget<MonthlyBudgetOverviewWidget>({
      id: params.id,
      type: 'monthly-budget-overview-card',
    });

  if (isPending) {
    return <LoadingIndicator />;
  }

  return <MonthlyBudgetOverviewInternal widget={widget} />;
}

type MonthlyBudgetOverviewInternalProps = {
  widget?: MonthlyBudgetOverviewWidget;
};

function MonthlyBudgetOverviewInternal({
  widget,
}: MonthlyBudgetOverviewInternalProps) {
  const locale = useLocale();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();

  const [anchorMonth, setAnchorMonth] = useState(
    widget?.meta?.month ?? monthUtils.currentMonth(),
  );
  const [period, setPeriod] = useState<MonthlyBudgetOverviewPeriod>(
    widget?.meta?.period ?? 'this-month',
  );

  const { startMonth, endMonth } = useMemo(
    () => getMonthlyBudgetOverviewRange(anchorMonth, period),
    [anchorMonth, period],
  );

  const { data, loading } = useAutomationOverview(startMonth, endMonth);

  const periodLabel = useMemo(() => {
    if (startMonth === endMonth) {
      return monthUtils.format(startMonth, 'MMMM yyyy', locale);
    }
    return `${monthUtils.format(startMonth, 'MMM yyyy', locale)} – ${monthUtils.format(endMonth, 'MMM yyyy', locale)}`;
  }, [startMonth, endMonth, locale]);

  const updateDashboardWidgetMutation = useUpdateDashboardWidgetMutation();

  function persistMeta(next: {
    month?: string;
    period?: MonthlyBudgetOverviewPeriod;
  }) {
    if (!widget) return;
    updateDashboardWidgetMutation.mutate({
      widget: {
        id: widget.id,
        meta: {
          ...(widget.meta ?? {}),
          ...next,
        },
      },
    });
  }

  async function onSaveWidget() {
    if (!widget) {
      throw new Error('No widget that could be saved.');
    }

    updateDashboardWidgetMutation.mutate(
      {
        widget: {
          id: widget.id,
          meta: {
            ...(widget.meta ?? {}),
            month: anchorMonth,
            period,
          },
        },
      },
      {
        onSuccess: () => {
          dispatch(
            addNotification({
              notification: {
                type: 'message',
                message: t('Dashboard widget successfully saved.'),
              },
            }),
          );
        },
      },
    );
  }

  const title = widget?.meta?.name || t('Monthly Budget Overview');

  const onSaveWidgetName = async (newName: string) => {
    if (!widget) {
      throw new Error('No widget that could be saved.');
    }

    updateDashboardWidgetMutation.mutate({
      widget: {
        id: widget.id,
        meta: {
          ...(widget.meta ?? {}),
          name: newName || t('Monthly Budget Overview'),
        },
      },
    });
  };

  const hasCategories =
    data != null && data.groups.some(group => group.categories.length > 0);

  return (
    <Page
      header={
        isNarrowWidth ? (
          <MobilePageHeader
            title={title}
            leftContent={
              <MobileBackButton onPress={() => navigate('/reports')} />
            }
          />
        ) : (
          <PageHeader
            title={
              widget ? (
                <EditablePageHeaderTitle
                  title={title}
                  onSave={onSaveWidgetName}
                />
              ) : (
                title
              )
            }
          />
        )
      }
      padding={0}
    >
      <MonthlyBudgetOverviewControls
        anchorMonth={anchorMonth}
        period={period}
        onAnchorMonthChange={month => {
          setAnchorMonth(month);
          persistMeta({ month });
        }}
        onPeriodChange={nextPeriod => {
          setPeriod(nextPeriod);
          persistMeta({ period: nextPeriod });
        }}
      />
      {widget && (
        <View
          style={{
            padding: 15,
            paddingTop: 0,
            backgroundColor: theme.tableBackground,
            borderBottom: `1px solid ${theme.tableBorder}`,
            alignItems: 'flex-end',
          }}
        >
          <Button variant="primary" onPress={onSaveWidget}>
            <Trans>Save widget</Trans>
          </Button>
        </View>
      )}
      <View
        style={{
          backgroundColor: theme.tableBackground,
          padding: 20,
          flex: '1 0 auto',
          overflowY: 'auto',
        }}
      >
        {loading || !data ? (
          <LoadingIndicator />
        ) : (
          <View style={{ gap: 24 }}>
            <View
              style={{
                flexDirection: isNarrowWidth ? 'column' : 'row',
                justifyContent: 'space-between',
                gap: 20,
              }}
            >
              <Block style={{ color: theme.pageTextSubdued }}>
                {periodLabel}
              </Block>
              <MonthlyBudgetOverviewSummary data={data} />
            </View>

            {!hasCategories ? (
              <Block style={{ color: theme.pageTextSubdued }}>
                <Trans>No categories have budget automations.</Trans>
              </Block>
            ) : (
              <MonthlyBudgetOverviewTable data={data} />
            )}

            <View style={{ marginTop: 16 }}>
              <Paragraph>
                <Trans>
                  This report compares what your budget automations project for
                  the selected period against what is currently budgeted in
                  those same categories. Categories without automations are
                  excluded. Remainder automations are shown as zero needed, and
                  negative budgeted amounts in those categories are ignored.
                </Trans>
              </Paragraph>
            </View>
          </View>
        )}
      </View>
    </Page>
  );
}
