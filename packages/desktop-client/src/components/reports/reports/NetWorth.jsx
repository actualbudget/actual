import React, { useState, useEffect, useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import * as d from 'date-fns';

import { addNotification } from 'loot-core/src/client/actions';
import { useWidget } from 'loot-core/src/client/data-hooks/widget';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';

import { useAccounts } from '../../../hooks/useAccounts';
import { useFilters } from '../../../hooks/useFilters';
import { useNavigate } from '../../../hooks/useNavigate';
import { useResponsive } from '../../../ResponsiveProvider';
import { theme, styles } from '../../../style';
import { Button } from '../../common/Button2';
import { Paragraph } from '../../common/Paragraph';
import { View } from '../../common/View';
import { MobileBackButton } from '../../mobile/MobileBackButton';
import { MobilePageHeader, Page, PageHeader } from '../../Page';
import { PrivacyFilter } from '../../PrivacyFilter';
import { Change } from '../Change';
import { NetWorthGraph } from '../graphs/NetWorthGraph';
import { Header } from '../Header';
import { LoadingIndicator } from '../LoadingIndicator';
import { calculateTimeRange } from '../reportRanges';
import { createSpreadsheet as netWorthSpreadsheet } from '../spreadsheets/net-worth-spreadsheet';
import { useReport } from '../useReport';
import { fromDateRepr } from '../util';

export function NetWorth() {
  const params = useParams();
  const { data: widget, isLoading } = useWidget(
    params.id ?? '',
    'net-worth-card',
  );

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return <NetWorthInner widget={widget} />;
}

function NetWorthInner({ widget }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const accounts = useAccounts();
  const {
    conditions,
    saved,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onConditionsOpChange,
  } = useFilters(widget?.meta?.conditions, widget?.meta?.conditionsOp);

  const [allMonths, setAllMonths] = useState(null);

  const [initialStart, initialEnd, initialMode] = calculateTimeRange(
    widget?.meta?.timeFrame,
  );
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [mode, setMode] = useState(initialMode);

  const reportParams = useMemo(
    () => netWorthSpreadsheet(start, end, accounts, conditions, conditionsOp),
    [start, end, accounts, conditions, conditionsOp],
  );
  const data = useReport('net_worth', reportParams);
  useEffect(() => {
    async function run() {
      const trans = await send('get-earliest-transaction');
      const currentMonth = monthUtils.currentMonth();
      let earliestMonth = trans
        ? monthUtils.monthFromDate(d.parseISO(fromDateRepr(trans.date)))
        : currentMonth;

      // Make sure the month selects are at least populates with a
      // year's worth of months. We can undo this when we have fancier
      // date selects.
      const yearAgo = monthUtils.subMonths(monthUtils.currentMonth(), 12);
      if (earliestMonth > yearAgo) {
        earliestMonth = yearAgo;
      }

      const allMonths = monthUtils
        .rangeInclusive(earliestMonth, monthUtils.currentMonth())
        .map(month => ({
          name: month,
          pretty: monthUtils.format(month, 'MMMM, yyyy'),
        }))
        .reverse();

      setAllMonths(allMonths);
    }
    run();
  }, []);

  function onChangeDates(start, end, mode) {
    setStart(start);
    setEnd(end);
    setMode(mode);
  }

  async function onSaveWidget() {
    await send('dashboard-update-widget', {
      id: widget?.id,
      meta: {
        ...(widget.meta ?? {}),
        conditions,
        conditionsOp,
        timeFrame: {
          start,
          end,
          mode,
        },
      },
    });
    dispatch(
      addNotification({
        type: 'message',
        message: t('Dashboard widget successfully saved.'),
      }),
    );
  }

  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();

  const title = widget?.meta?.name ?? t('Net Worth');

  if (!allMonths || !data) {
    return null;
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
          <PageHeader title={title} />
        )
      }
      padding={0}
    >
      <Header
        allMonths={allMonths}
        start={start}
        end={end}
        mode={mode}
        onChangeDates={onChangeDates}
        filters={conditions}
        saved={saved}
        onApply={onApplyFilter}
        onUpdateFilter={onUpdateFilter}
        onDeleteFilter={onDeleteFilter}
        conditionsOp={conditionsOp}
        onConditionsOpChange={onConditionsOpChange}
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
          paddingTop: 0,
          flex: '1 0 auto',
          overflowY: 'auto',
        }}
      >
        <View
          style={{
            textAlign: 'right',
            paddingTop: 20,
          }}
        >
          <View
            style={{ ...styles.largeText, fontWeight: 400, marginBottom: 5 }}
          >
            <PrivacyFilter blurIntensity={5}>
              {integerToCurrency(data.netWorth)}
            </PrivacyFilter>
          </View>
          <PrivacyFilter>
            <Change amount={data.totalChange} />
          </PrivacyFilter>
        </View>

        <NetWorthGraph
          start={start}
          end={end}
          graphData={data.graphData}
          domain={{
            y: [data.lowestNetWorth * 0.99, data.highestNetWorth * 1.01],
          }}
          showTooltip={!isNarrowWidth}
        />

        <View style={{ marginTop: 30, userSelect: 'none' }}>
          <Trans>
            <Paragraph>
              <strong>How is net worth calculated?</strong>
            </Paragraph>
            <Paragraph>
              Net worth shows the balance of all accounts over time, including
              all of your investments. Your “net worth” is considered to be the
              amount you’d have if you sold all your assets and paid off as much
              debt as possible. If you hover over the graph, you can also see
              the amount of assets and debt individually.
            </Paragraph>
          </Trans>
        </View>
      </View>
    </Page>
  );
}
