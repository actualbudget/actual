import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgDownload } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  AccountEntity,
  FxImpactWidget,
  TimeFrame,
} from '@actual-app/core/types/models';

import { EditablePageHeaderTitle } from '#components/EditablePageHeaderTitle';
import { MobileBackButton } from '#components/mobile/MobileBackButton';
import { MobilePageHeader, Page, PageHeader } from '#components/Page';
import { AccountSelector } from '#components/reports/AccountSelector';
import { Header } from '#components/reports/Header';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { calculateTimeRange } from '#components/reports/reportRanges';
import { buildFxImpactCsv } from '#components/reports/spreadsheets/fx-impact-export';
import { fromDateRepr } from '#components/reports/util';
import { useAccounts } from '#hooks/useAccounts';
import { useDashboardWidget } from '#hooks/useDashboardWidget';
import { fxImpactSelection, useFxImpact } from '#hooks/useFxImpact';
import { useNavigate } from '#hooks/useNavigate';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import { useUpdateDashboardWidgetMutation } from '#reports/mutations';

import { defaultFxImpactTimeFrame } from './FxImpactCard';
import { FxImpactTable } from './FxImpactTable';

export function FxImpact() {
  const params = useParams();
  const { data: widget, isPending } = useDashboardWidget<FxImpactWidget>({
    id: params.id,
    type: 'fx-impact-card',
  });

  if (params.id && isPending) {
    return <LoadingIndicator />;
  }

  // Selections start from the widget's saved meta, so another widget remounts.
  return <FxImpactInternal key={widget?.id} widget={widget} />;
}

function FxImpactInternal({ widget }: { widget?: FxImpactWidget }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();
  const { data: accounts = [] } = useAccounts();
  const [firstDayOfWeekIdx = '0'] = useSyncedPref('firstDayOfWeekIdx');
  const [budgetCurrency = ''] = useSyncedPref('defaultCurrencyCode');

  const [timeFrame, setTimeFrame] = useState<TimeFrame>(
    widget?.meta?.timeFrame ?? defaultFxImpactTimeFrame(),
  );
  const [accountIds, setAccountIds] = useState(widget?.meta?.accounts ?? null);
  const [currencies, setCurrencies] = useState(
    widget?.meta?.currencies ?? null,
  );
  const [earliestMonth, setEarliestMonth] = useState(monthUtils.currentMonth);
  useEffect(() => {
    void send('get-earliest-transaction').then(transaction => {
      if (transaction) {
        setEarliestMonth(monthUtils.getMonth(fromDateRepr(transaction.date)));
      }
    });
  }, []);

  const [start, end] = calculateTimeRange(timeFrame);
  const selection = fxImpactSelection(start, end, accountIds, currencies);
  const { data, isError, isLoading, retry } = useFxImpact(selection);

  const allMonths = monthUtils
    .rangeInclusive(earliestMonth, monthUtils.currentMonth())
    .map(name => ({ name }))
    .reverse();
  const currencyOptions = [
    ...new Set(
      [budgetCurrency, ...accounts.map(account => account.currency)].filter(
        (code): code is string => !!code,
      ),
    ),
  ];
  const title = widget?.meta?.name || t('FX impact');
  const updateDashboardWidgetMutation = useUpdateDashboardWidgetMutation();

  function onSaveWidget() {
    if (!widget) return;
    updateDashboardWidgetMutation.mutate(
      {
        widget: {
          id: widget.id,
          meta: {
            ...widget.meta,
            timeFrame,
            accounts: accountIds ?? undefined,
            currencies: currencies ?? undefined,
          },
        },
      },
      {
        onSuccess: () =>
          dispatch(
            addNotification({
              notification: {
                type: 'message',
                message: t('Dashboard widget successfully saved.'),
              },
            }),
          ),
      },
    );
  }

  function onSaveWidgetName(newName: string) {
    if (!widget) return;
    updateDashboardWidgetMutation.mutate({
      widget: {
        id: widget.id,
        meta: { ...widget.meta, name: newName || t('FX impact') },
      },
    });
  }

  // The file holds exactly the result on screen.
  function onExport() {
    if (!data || !selection) return;
    const name = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    void window.Actual.saveFile(
      buildFxImpactCsv(data),
      `${name}-${selection.startMonth}-${selection.endMonth}.csv`,
      t('Export FX impact'),
    );
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
        start={start}
        end={end}
        mode={timeFrame.mode}
        allMonths={allMonths}
        earliestTransaction={earliestMonth}
        latestTransaction={monthUtils.currentDay()}
        firstDayOfWeekIdx={firstDayOfWeekIdx}
        onChangeDates={(newStart, newEnd, mode) =>
          setTimeFrame({ start: newStart, end: newEnd, mode })
        }
      >
        <AccountsButton
          accounts={accounts}
          selected={accountIds}
          onChange={setAccountIds}
        />
        <CurrenciesButton
          options={currencyOptions}
          selected={currencies}
          onChange={setCurrencies}
        />
        <Tooltip content={t('Export as CSV')}>
          <Button
            variant="bare"
            onPress={onExport}
            isDisabled={!data}
            aria-label={t('Export as CSV')}
          >
            <SvgDownload style={{ width: 16, height: 16 }} />
          </Button>
        </Tooltip>
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
          paddingTop: 0,
          gap: 15,
          flex: '1 0 auto',
        }}
      >
        <p style={{ margin: 0, color: theme.pageTextSubdued }}>
          <Trans>
            Positive amounts are gains. Fee expense is a booked cost, not an FX
            change. FX changes already included in To Budget are shown
            separately at the end.
          </Trans>
        </p>
        {!selection && (
          <p style={{ margin: 0 }}>
            <Trans>Choose a range of 120 months or fewer.</Trans>
          </p>
        )}
        {isError && (
          <View role="alert" style={{ gap: 8, alignItems: 'flex-start' }}>
            <p style={{ margin: 0 }}>
              {data ? (
                <Trans>
                  Could not refresh the FX impact report. The figures below are
                  from the last successful read.
                </Trans>
              ) : (
                <Trans>Could not load the FX impact report.</Trans>
              )}
            </p>
            <Button onPress={retry}>
              <Trans>Retry</Trans>
            </Button>
          </View>
        )}
        {isLoading && <LoadingIndicator />}
        {data && <FxImpactTable result={data} />}
      </View>
    </Page>
  );
}

function AccountsButton({
  accounts,
  selected,
  onChange,
}: {
  accounts: AccountEntity[];
  selected: string[] | null;
  onChange: (ids: string[]) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button ref={triggerRef} onPress={() => setIsOpen(true)}>
        <Trans>Accounts</Trans>
      </Button>
      <Popover
        triggerRef={triggerRef}
        placement="bottom end"
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
        style={{ padding: 10, maxHeight: 400, overflowY: 'auto' }}
      >
        <AccountSelector
          accounts={accounts}
          selectedAccountIds={selected ?? accounts.map(account => account.id)}
          setSelectedAccountIds={onChange}
        />
      </Popover>
    </>
  );
}

function CurrenciesButton({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[] | null;
  onChange: (codes: string[] | null) => void;
}) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button ref={triggerRef} onPress={() => setIsOpen(true)}>
        <Trans>Currencies</Trans>
      </Button>
      <Popover
        triggerRef={triggerRef}
        placement="bottom end"
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
      >
        <Menu
          onMenuSelect={name => {
            if (name === 'all') {
              onChange(null);
              return;
            }
            const current = selected ?? options;
            onChange(
              current.includes(name)
                ? current.filter(code => code !== name)
                : [...current, name],
            );
          }}
          items={[
            {
              name: 'all',
              text: t('All currencies'),
              toggle: selected === null,
            },
            Menu.line,
            ...options.map(code => ({
              name: code,
              text: code,
              toggle: selected === null || selected.includes(code),
            })),
          ]}
        />
      </Popover>
    </>
  );
}
