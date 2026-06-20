import { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Paragraph } from '@actual-app/components/paragraph';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CategoryEntity,
  MonthlyBudgetOverviewPeriod,
  MonthlyBudgetOverviewWidget,
} from '@actual-app/core/types/models';
import * as d from 'date-fns';

import { EditablePageHeaderTitle } from '#components/EditablePageHeaderTitle';
import { MobileBackButton } from '#components/mobile/MobileBackButton';
import { MobilePageHeader, Page, PageHeader } from '#components/Page';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { MonthlyBudgetOverviewSidebar } from '#components/reports/reports/MonthlyBudgetOverviewSidebar';
import { MonthlyBudgetOverviewSummary } from '#components/reports/reports/MonthlyBudgetOverviewSummary';
import { MonthlyBudgetOverviewTable } from '#components/reports/reports/MonthlyBudgetOverviewTable';
import { fromDateRepr } from '#components/reports/util';
import { useAutomationOverview } from '#hooks/useAutomationOverview';
import { useCategories } from '#hooks/useCategories';
import { useDashboardWidget } from '#hooks/useDashboardWidget';
import { useLocale } from '#hooks/useLocale';
import { useNavigate } from '#hooks/useNavigate';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import { useUpdateDashboardWidgetMutation } from '#reports/mutations';

import { filterAutomationOverview } from './filterAutomationOverview';
import {
  applyMonthlyBudgetOverviewPeriod,
  detectMonthlyBudgetOverviewPeriod,
  getMonthlyBudgetOverviewRange,
} from './monthlyBudgetOverviewPeriods';

function getInitialDateRange(widget?: MonthlyBudgetOverviewWidget) {
  const currentMonth = monthUtils.currentMonth();

  if (widget?.meta?.startMonth && widget?.meta?.endMonth) {
    return {
      startMonth: widget.meta.startMonth,
      endMonth: widget.meta.endMonth,
    };
  }

  if (widget?.meta?.month && widget?.meta?.period) {
    return getMonthlyBudgetOverviewRange(widget.meta.month, widget.meta.period);
  }

  return { startMonth: currentMonth, endMonth: currentMonth };
}

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
  const { data: categories = { grouped: [], list: [] } } = useCategories();

  const initialRange = getInitialDateRange(widget);
  const [startMonth, setStartMonth] = useState(initialRange.startMonth);
  const [endMonth, setEndMonth] = useState(initialRange.endMonth);
  const [period, setPeriod] = useState<MonthlyBudgetOverviewPeriod | 'custom'>(
    () =>
      widget?.meta?.period ??
      detectMonthlyBudgetOverviewPeriod(
        initialRange.startMonth,
        initialRange.endMonth,
        initialRange.startMonth,
      ),
  );
  const [selectedCategories, setSelectedCategories] = useState<
    CategoryEntity[]
  >([]);
  const [monthOptions, setMonthOptions] = useState<
    Array<{ name: string; pretty: string }>
  >([]);

  useEffect(() => {
    async function loadMonthOptions() {
      const earliestTrans = await send('get-earliest-transaction');
      const currentMonth = monthUtils.currentMonth();
      const earliestMonth = earliestTrans
        ? monthUtils.monthFromDate(d.parseISO(fromDateRepr(earliestTrans.date)))
        : monthUtils.subMonths(currentMonth, 24);
      const latestMonth = monthUtils.addMonths(currentMonth, 12);

      setMonthOptions(
        monthUtils
          .rangeInclusive(
            earliestMonth < monthUtils.subMonths(currentMonth, 24)
              ? earliestMonth
              : monthUtils.subMonths(currentMonth, 24),
            latestMonth,
          )
          .map(month => ({
            name: month,
            pretty: monthUtils.format(month, 'MMMM, yyyy', locale),
          }))
          .reverse(),
      );
    }

    void loadMonthOptions();
  }, [locale]);

  useEffect(() => {
    if (categories.list.length === 0) {
      return;
    }

    if (widget?.meta?.categoryIds?.length) {
      setSelectedCategories(
        categories.list.filter(category =>
          widget.meta?.categoryIds?.includes(category.id),
        ),
      );
      return;
    }

    setSelectedCategories(current =>
      current.length > 0 ? current : categories.list,
    );
  }, [categories.list, widget?.meta?.categoryIds]);

  const { data, loading } = useAutomationOverview(startMonth, endMonth);

  const filteredData = useMemo(() => {
    if (!data || selectedCategories.length === 0) {
      return data;
    }

    return filterAutomationOverview(data, selectedCategories);
  }, [data, selectedCategories]);

  const updateDashboardWidgetMutation = useUpdateDashboardWidgetMutation();

  function persistMeta(
    next: Partial<NonNullable<MonthlyBudgetOverviewWidget['meta']>>,
  ) {
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

  function updateDateRange(nextStart: string, nextEnd: string) {
    setStartMonth(nextStart);
    setEndMonth(nextEnd);
    const nextPeriod = detectMonthlyBudgetOverviewPeriod(
      nextStart,
      nextEnd,
      nextStart,
    );
    setPeriod(nextPeriod);
    persistMeta({
      startMonth: nextStart,
      endMonth: nextEnd,
      period: nextPeriod === 'custom' ? undefined : nextPeriod,
      month: nextStart,
    });
  }

  function onStartMonthChange(nextStart: string) {
    const nextEnd = nextStart > endMonth ? nextStart : endMonth;
    updateDateRange(nextStart, nextEnd);
  }

  function onEndMonthChange(nextEnd: string) {
    const nextStart = nextEnd < startMonth ? nextEnd : startMonth;
    updateDateRange(nextStart, nextEnd);
  }

  function onPeriodChange(nextPeriod: MonthlyBudgetOverviewPeriod | 'custom') {
    setPeriod(nextPeriod);

    if (nextPeriod === 'custom') {
      persistMeta({ period: undefined });
      return;
    }

    const range = applyMonthlyBudgetOverviewPeriod(startMonth, nextPeriod);
    if (!range) {
      return;
    }

    setStartMonth(range.startMonth);
    setEndMonth(range.endMonth);
    persistMeta({
      startMonth: range.startMonth,
      endMonth: range.endMonth,
      period: nextPeriod,
      month: range.startMonth,
    });
  }

  function onSelectedCategoriesChange(nextCategories: CategoryEntity[]) {
    setSelectedCategories(nextCategories);
    persistMeta({
      categoryIds: nextCategories.map(category => category.id),
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
            startMonth,
            endMonth,
            period: period === 'custom' ? undefined : period,
            month: startMonth,
            categoryIds: selectedCategories.map(category => category.id),
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
    filteredData != null &&
    filteredData.groups.some(group => group.categories.length > 0);

  const sidebar = monthOptions.length > 0 && (
    <MonthlyBudgetOverviewSidebar
      startMonth={startMonth}
      endMonth={endMonth}
      period={period}
      monthOptions={monthOptions}
      categoryGroups={categories.grouped}
      selectedCategories={selectedCategories}
      onStartMonthChange={onStartMonthChange}
      onEndMonthChange={onEndMonthChange}
      onPeriodChange={onPeriodChange}
      onSelectedCategoriesChange={onSelectedCategoriesChange}
    />
  );

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
      {widget && !isNarrowWidth && (
        <View
          style={{
            padding: 15,
            paddingBottom: 0,
            backgroundColor: theme.tableBackground,
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
          flexDirection: 'row',
          paddingLeft: !isNarrowWidth ? 20 : undefined,
          flex: 1,
        }}
      >
        {!isNarrowWidth && sidebar}
        <View style={{ flex: 1 }}>
          {isNarrowWidth && (
            <View
              style={{
                paddingLeft: 15,
                paddingRight: 15,
                backgroundColor: theme.tableBackground,
              }}
            >
              {sidebar}
              {widget && (
                <View style={{ paddingBottom: 15, alignItems: 'flex-end' }}>
                  <Button variant="primary" onPress={onSaveWidget}>
                    <Trans>Save widget</Trans>
                  </Button>
                </View>
              )}
            </View>
          )}
          <View
            id="monthly-budget-overview-content"
            style={{ flexDirection: 'row', flex: '1 0 auto' }}
          >
            <View
              style={{
                flex: 1,
                padding: 20,
                backgroundColor: theme.tableBackground,
                overflowY: 'auto',
              }}
            >
              {loading || !filteredData ? (
                <LoadingIndicator />
              ) : (
                <View style={{ gap: 24 }}>
                  {isNarrowWidth && (
                    <MonthlyBudgetOverviewSummary data={filteredData} compact />
                  )}

                  {!hasCategories ? (
                    <Block style={{ color: theme.pageTextSubdued }}>
                      <Trans>No categories have budget automations.</Trans>
                    </Block>
                  ) : (
                    <MonthlyBudgetOverviewTable data={filteredData} />
                  )}

                  <View style={{ marginTop: 16 }}>
                    <Paragraph>
                      <Trans>
                        This report compares what your budget automations
                        project for the selected period against what is
                        currently budgeted in those same categories. Categories
                        without automations are excluded. Remainder automations
                        are shown as zero needed, and negative budgeted amounts
                        in those categories are ignored.
                      </Trans>
                    </Paragraph>
                  </View>
                </View>
              )}
            </View>
            {!isNarrowWidth && filteredData && !loading && (
              <View style={{ padding: 10, minWidth: 300 }}>
                <MonthlyBudgetOverviewSummary data={filteredData} />
              </View>
            )}
          </View>
        </View>
      </View>
    </Page>
  );
}
