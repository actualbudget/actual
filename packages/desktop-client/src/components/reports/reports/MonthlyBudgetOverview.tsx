import { useEffect, useMemo, useState } from 'react';
import i18n from 'i18next';
import { Trans } from 'react-i18next';
import { useParams } from 'react-router';

import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgDownload } from '@actual-app/components/icons/v1';
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
  exportMonthlyBudgetOverviewCsv,
  getMonthlyBudgetOverviewCsvFilename,
} from './monthlyBudgetOverviewCsv';
import {
  detectMonthlyBudgetOverviewPeriod,
  getMonthlyBudgetOverviewMonth,
  MONTHLY_BUDGET_OVERVIEW_PERIODS,
} from './monthlyBudgetOverviewPeriods';

function getInitialMonth(widget?: MonthlyBudgetOverviewWidget) {
  const currentMonth = monthUtils.currentMonth();

  if (widget?.meta?.month) {
    return widget.meta.month;
  }

  if (widget?.meta?.startMonth) {
    return widget.meta.startMonth;
  }

  if (
    widget?.meta?.period &&
    MONTHLY_BUDGET_OVERVIEW_PERIODS.includes(widget.meta.period)
  ) {
    return getMonthlyBudgetOverviewMonth(widget.meta.period);
  }

  return currentMonth;
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
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();
  const { data: categories = { grouped: [], list: [] } } = useCategories();

  const initialMonth = getInitialMonth(widget);
  const [month, setMonth] = useState(initialMonth);
  const [period, setPeriod] = useState<MonthlyBudgetOverviewPeriod | null>(
    () => {
      if (
        widget?.meta?.period &&
        MONTHLY_BUDGET_OVERVIEW_PERIODS.includes(widget.meta.period)
      ) {
        return widget.meta.period;
      }

      return detectMonthlyBudgetOverviewPeriod(initialMonth);
    },
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
          .map(item => ({
            name: item,
            pretty: monthUtils.format(item, 'MMMM, yyyy', locale),
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

  const { data, loading } = useAutomationOverview(month, month);

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

  function onMonthChange(nextMonth: string) {
    setMonth(nextMonth);
    const nextPeriod = detectMonthlyBudgetOverviewPeriod(nextMonth);
    setPeriod(nextPeriod);
    persistMeta({
      month: nextMonth,
      startMonth: nextMonth,
      endMonth: nextMonth,
      period: nextPeriod ?? undefined,
    });
  }

  function onPeriodChange(nextPeriod: MonthlyBudgetOverviewPeriod) {
    const nextMonth = getMonthlyBudgetOverviewMonth(nextPeriod);
    setMonth(nextMonth);
    setPeriod(nextPeriod);
    persistMeta({
      month: nextMonth,
      startMonth: nextMonth,
      endMonth: nextMonth,
      period: nextPeriod,
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
            month,
            startMonth: month,
            endMonth: month,
            period: period ?? undefined,
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
                message: i18n.t('Dashboard widget successfully saved.'),
              },
            }),
          );
        },
      },
    );
  }

  const title = widget?.meta?.name || i18n.t('Monthly Budget Overview');

  const onSaveWidgetName = async (newName: string) => {
    if (!widget) {
      throw new Error('No widget that could be saved.');
    }

    updateDashboardWidgetMutation.mutate({
      widget: {
        id: widget.id,
        meta: {
          ...(widget.meta ?? {}),
          name: newName || i18n.t('Monthly Budget Overview'),
        },
      },
    });
  };

  const hasCategories =
    filteredData != null &&
    filteredData.groups.some(group => group.categories.length > 0);

  const canExportCsv = filteredData != null && hasCategories && !loading;

  function onDownloadCsv() {
    if (!filteredData) {
      return;
    }

    const csv = exportMonthlyBudgetOverviewCsv(filteredData, { locale });
    void window.Actual.saveFile(
      csv,
      getMonthlyBudgetOverviewCsvFilename(month),
      i18n.t('Download CSV'),
    );
  }

  const actionButtons = (
    <View
      style={{
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
      }}
    >
      {canExportCsv && (
        <Button
          variant="bare"
          aria-label={i18n.t('Download CSV')}
          onPress={onDownloadCsv}
        >
          <SvgDownload width={15} height={15} />
        </Button>
      )}
      {widget && (
        <Button variant="primary" onPress={onSaveWidget}>
          <Trans>Save widget</Trans>
        </Button>
      )}
    </View>
  );

  const sidebar = monthOptions.length > 0 && (
    <MonthlyBudgetOverviewSidebar
      month={month}
      period={period}
      monthOptions={monthOptions}
      categoryGroups={categories.grouped}
      selectedCategories={selectedCategories}
      onMonthChange={onMonthChange}
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
      {(widget || canExportCsv) && !isNarrowWidth && (
        <View
          style={{
            padding: 15,
            paddingBottom: 0,
            backgroundColor: theme.pageBackground,
            alignItems: 'flex-end',
          }}
        >
          {actionButtons}
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
              {(widget || canExportCsv) && (
                <View style={{ paddingBottom: 15, alignItems: 'flex-end' }}>
                  {actionButtons}
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
                    <MonthlyBudgetOverviewSummary data={filteredData} />
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
                        project for the selected month against what is currently
                        budgeted in those same categories. Categories without
                        automations are excluded. Remainder automations are
                        shown as zero needed, and negative budgeted amounts in
                        those categories are ignored.
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
