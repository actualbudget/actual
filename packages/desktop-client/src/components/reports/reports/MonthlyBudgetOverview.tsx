import { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Paragraph } from '@actual-app/components/paragraph';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type { MonthlyBudgetOverviewWidget } from '@actual-app/core/types/models';

import { EditablePageHeaderTitle } from '#components/EditablePageHeaderTitle';
import { FinancialText } from '#components/FinancialText';
import { MobileBackButton } from '#components/mobile/MobileBackButton';
import { MobilePageHeader, Page, PageHeader } from '#components/Page';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { Header } from '#components/reports/Header';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { MonthlyBudgetOverviewSummary } from '#components/reports/reports/MonthlyBudgetOverviewSummary';
import { useAutomationOverview } from '#hooks/useAutomationOverview';
import { useDashboardWidget } from '#hooks/useDashboardWidget';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useNavigate } from '#hooks/useNavigate';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import { useUpdateDashboardWidgetMutation } from '#reports/mutations';

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
  const format = useFormat();
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();

  const [month, setMonth] = useState(
    widget?.meta?.month ?? monthUtils.currentMonth(),
  );
  const [allMonths, setAllMonths] = useState<Array<{
    name: string;
    pretty: string;
  }> | null>(null);
  const [latestTransaction, setLatestTransaction] = useState('');

  const { data, loading } = useAutomationOverview(month);

  useEffect(() => {
    async function run() {
      const latestTrans = await send('get-latest-transaction');
      const latestTransDate = latestTrans
        ? latestTrans.date
        : monthUtils.currentDay();
      setLatestTransaction(latestTransDate);

      const currentMonth = monthUtils.currentMonth();
      const latestMonth = monthUtils.monthFromDate(latestTransDate);
      const endMonth = latestMonth > currentMonth ? latestMonth : currentMonth;
      const startMonth = monthUtils.subMonths(endMonth, 24);

      setAllMonths(
        monthUtils
          .rangeInclusive(startMonth, endMonth)
          .map(item => ({
            name: item,
            pretty: monthUtils.format(item, 'MMMM, yyyy', locale),
          }))
          .reverse(),
      );
    }
    void run();
  }, [locale]);

  const monthLabel = useMemo(
    () => monthUtils.format(month, 'MMMM yyyy', locale),
    [month, locale],
  );

  const updateDashboardWidgetMutation = useUpdateDashboardWidgetMutation();

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

  if (!allMonths) {
    return <LoadingIndicator />;
  }

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
      <Header
        start={month}
        end={month}
        mode="static"
        show1Month
        allMonths={allMonths}
        earliestTransaction={allMonths[allMonths.length - 1].name}
        latestTransaction={latestTransaction}
        hideModeToggle
        onChangeDates={newStart => {
          setMonth(newStart);
          if (widget) {
            updateDashboardWidgetMutation.mutate({
              widget: {
                id: widget.id,
                meta: {
                  ...(widget.meta ?? {}),
                  month: newStart,
                },
              },
            });
          }
        }}
      >
        {widget && (
          <Button variant="primary" onPress={onSaveWidget}>
            <Trans>Save widget</Trans>
          </Button>
        )}
      </Header>
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
              <Block style={{ color: theme.pageTextSubdued }}>{monthLabel}</Block>
              <MonthlyBudgetOverviewSummary data={data} />
            </View>

            {data.categories.length === 0 ? (
              <Block style={{ color: theme.pageTextSubdued }}>
                <Trans>No categories have budget automations.</Trans>
              </Block>
            ) : (
              <View style={{ gap: 8 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    borderBottom: `1px solid ${theme.tableBorder}`,
                    paddingBottom: 8,
                    color: theme.pageTextSubdued,
                    fontWeight: 600,
                  }}
                >
                  <Block style={{ flex: 1 }}>
                    <Trans>Category</Trans>
                  </Block>
                  <Block style={{ width: 120, textAlign: 'right' }}>
                    <Trans>Needed</Trans>
                  </Block>
                  <Block style={{ width: 120, textAlign: 'right' }}>
                    <Trans>Budgeted</Trans>
                  </Block>
                  <Block style={{ width: 120, textAlign: 'right' }}>
                    <Trans>Still needed</Trans>
                  </Block>
                </View>
                {data.categories.map(category => (
                  <View
                    key={category.categoryId}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingBlock: 4,
                    }}
                  >
                    <Block style={{ flex: 1 }}>{category.categoryName}</Block>
                    <AlignedText
                      style={{ width: 120 }}
                      right={
                        <FinancialText>
                          <PrivacyFilter>
                            {format(category.needed, 'financial')}
                          </PrivacyFilter>
                        </FinancialText>
                      }
                    />
                    <AlignedText
                      style={{ width: 120 }}
                      right={
                        <FinancialText>
                          <PrivacyFilter>
                            {format(category.budgeted, 'financial')}
                          </PrivacyFilter>
                        </FinancialText>
                      }
                    />
                    <AlignedText
                      style={{ width: 120 }}
                      right={
                        <FinancialText
                          style={{
                            color:
                              category.remaining > 0
                                ? theme.errorText
                                : undefined,
                          }}
                        >
                          <PrivacyFilter>
                            {format(category.remaining, 'financial')}
                          </PrivacyFilter>
                        </FinancialText>
                      }
                    />
                  </View>
                ))}
              </View>
            )}

            <View style={{ marginTop: 16 }}>
              <Paragraph>
                <Trans>
                  This report compares what your budget automations project for
                  the selected month against what is currently budgeted in those
                  same categories. Categories without automations are excluded.
                </Trans>
              </Paragraph>
            </View>
          </View>
        )}
      </View>
    </Page>
  );
}
