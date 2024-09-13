import React, { useState, useMemo, useEffect } from 'react';

import * as d from 'date-fns';

import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { amountToCurrency } from 'loot-core/src/shared/util';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { useFilters } from '../../../hooks/useFilters';
import { useLocalPref } from '../../../hooks/useLocalPref';
import { useNavigate } from '../../../hooks/useNavigate';
import { useResponsive } from '../../../ResponsiveProvider';
import { theme, styles } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { Block } from '../../common/Block';
import { Button } from '../../common/Button2';
import { Paragraph } from '../../common/Paragraph';
import { Select } from '../../common/Select';
import { Text } from '../../common/Text';
import { Tooltip } from '../../common/Tooltip';
import { View } from '../../common/View';
import { AppliedFilters } from '../../filters/AppliedFilters';
import { FilterButton } from '../../filters/FiltersMenu';
import { MobileBackButton } from '../../mobile/MobileBackButton';
import { MobilePageHeader, Page, PageHeader } from '../../Page';
import { PrivacyFilter } from '../../PrivacyFilter';
import { SpendingGraph } from '../graphs/SpendingGraph';
import { LoadingIndicator } from '../LoadingIndicator';
import { ModeButton } from '../ModeButton';
import { createSpendingSpreadsheet } from '../spreadsheets/spending-spreadsheet';
import { useReport } from '../useReport';
import { fromDateRepr } from '../util';

export function Spending() {
  const {
    conditions,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onConditionsOpChange,
  } = useFilters<RuleConditionEntity>();

  const emptyIntervals: { name: string; pretty: string }[] = [];
  const [allIntervals, setAllIntervals] = useState(emptyIntervals);

  const [spendingReportFilter = '', setSpendingReportFilter] = useLocalPref(
    'spendingReportFilter',
  );
  const [spendingReportMode = 'singleMonth', setSpendingReportMode] =
    useLocalPref('spendingReportMode');
  const [
    spendingReportCompare = monthUtils.currentMonth(),
    setSpendingReportCompare,
  ] = useLocalPref('spendingReportCompare');
  const [
    spendingReportCompareTo = monthUtils.currentMonth(),
    setSpendingReportCompareTo,
  ] = useLocalPref('spendingReportCompareTo');

  const isDateValid = monthUtils.parseDate(spendingReportCompare);
  const [dataCheck, setDataCheck] = useState(false);
  const [mode, setMode] = useState(spendingReportMode);
  const [compare, setCompare] = useState(
    isDateValid.toString() === 'Invalid Date'
      ? monthUtils.currentMonth()
      : spendingReportCompare,
  );
  const [compareTo, setCompareTo] = useState(spendingReportCompareTo);

  const parseFilter = spendingReportFilter && JSON.parse(spendingReportFilter);
  const filterSaved =
    JSON.stringify(parseFilter.conditions) === JSON.stringify(conditions) &&
    parseFilter.conditionsOp === conditionsOp &&
    spendingReportMode === mode &&
    spendingReportCompare === compare &&
    spendingReportCompareTo === compareTo;

  useEffect(() => {
    async function run() {
      const trans = await send('get-earliest-transaction');

      let earliestMonth = trans
        ? monthUtils.monthFromDate(d.parseISO(fromDateRepr(trans.date)))
        : monthUtils.currentMonth();

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

      setAllIntervals(allMonths);
    }
    run();
    const checkFilter =
      spendingReportFilter && JSON.parse(spendingReportFilter);
    if (checkFilter.conditions) {
      onApplyFilter(checkFilter);
    }
  }, [onApplyFilter, spendingReportFilter]);

  const getGraphData = useMemo(() => {
    setDataCheck(false);
    return createSpendingSpreadsheet({
      conditions,
      conditionsOp,
      setDataCheck,
      compare,
      compareTo,
    });
  }, [conditions, conditionsOp, compare, compareTo]);

  const data = useReport('default', getGraphData);
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();

  if (!data) {
    return null;
  }

  const saveFilter = () => {
    setSpendingReportFilter(
      JSON.stringify({
        conditionsOp,
        conditions,
      }),
    );
    setSpendingReportMode(mode);
    setSpendingReportCompare(compare);
    setSpendingReportCompareTo(compareTo);
  };

  const showAverage =
    data.intervalData[27].months[monthUtils.subMonths(compare, 3)] &&
    Math.abs(
      data.intervalData[27].months[monthUtils.subMonths(compare, 3)].cumulative,
    ) > 0;

  const todayDay =
    compare !== monthUtils.currentMonth()
      ? 27
      : monthUtils.getDay(monthUtils.currentDay()) - 1 >= 28
        ? 27
        : monthUtils.getDay(monthUtils.currentDay()) - 1;

  const showCompareTo = Math.abs(data.intervalData[27].compareTo) > 0;
  const showCompare =
    compare === monthUtils.currentMonth() ||
    Math.abs(data.intervalData[27].compare) > 0;
  return (
    <Page
      header={
        isNarrowWidth ? (
          <MobilePageHeader
            title="Monthly Spending"
            leftContent={
              <MobileBackButton onPress={() => navigate('/reports')} />
            }
          />
        ) : (
          <PageHeader title="Monthly Spending" />
        )
      }
      padding={0}
    >
      <View
        style={{
          flexDirection: isNarrowWidth ? 'column' : 'row',
          alignItems: isNarrowWidth ? 'inherit' : 'center',
          padding: 20,
          paddingBottom: 0,
          flexShrink: 0,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            marginRight: 5,
            marginBottom: 5,
            marginTop: 5,
          }}
        >
          <Text
            style={{
              paddingRight: 5,
            }}
          >
            Compare
          </Text>
          <Select
            value={compare}
            onChange={e => {
              setCompare(e);
            }}
            options={allIntervals.map(({ name, pretty }) => [name, pretty])}
          />
          <Text
            style={{
              paddingRight: 5,
              paddingLeft: 5,
            }}
          >
            to
          </Text>
          <Select
            value={compareTo}
            onChange={e => {
              setCompareTo(e);
            }}
            options={allIntervals.map(({ name, pretty }) => [name, pretty])}
            disabled={mode !== 'singleMonth'}
          />
        </View>
        {!isNarrowWidth && (
          <View
            style={{
              width: 1,
              height: 30,
              backgroundColor: theme.pillBorderDark,
              marginRight: 15,
              marginLeft: 10,
            }}
          />
        )}
        <View
          style={{
            flexDirection: 'row',
            marginRight: 5,
            marginTop: 5,
            marginBottom: 5,
          }}
        >
          <ModeButton
            selected={mode === 'singleMonth'}
            style={{
              backgroundColor: 'inherit',
            }}
            onSelect={() => setMode('singleMonth')}
          >
            Single month
          </ModeButton>
          <ModeButton
            selected={mode === 'budget'}
            onSelect={() => setMode('budget')}
            style={{
              backgroundColor: 'inherit',
            }}
          >
            Budgeted
          </ModeButton>
          <ModeButton
            selected={mode === 'average'}
            onSelect={() => setMode('average')}
            style={{
              backgroundColor: 'inherit',
            }}
          >
            Average
          </ModeButton>
        </View>
        {!isNarrowWidth && (
          <View
            style={{
              width: 1,
              height: 30,
              backgroundColor: theme.pillBorderDark,
              marginRight: 10,
            }}
          />
        )}
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            marginBottom: 5,
            marginTop: 5,
            flex: 1,
          }}
        >
          <FilterButton
            onApply={onApplyFilter}
            compact={isNarrowWidth}
            hover={false}
            exclude={['date']}
          />
          <View style={{ flex: 1 }} />
          <Tooltip
            placement="top end"
            content={<Text>Save compare and filter options</Text>}
            style={{
              ...styles.tooltip,
              lineHeight: 1.5,
              padding: '6px 10px',
              marginLeft: 10,
            }}
          >
            <Button
              variant="primary"
              style={{
                marginLeft: 10,
              }}
              onPress={saveFilter}
              isDisabled={filterSaved}
            >
              {filterSaved ? 'Saved' : 'Save'}
            </Button>
          </Tooltip>
        </View>
      </View>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          paddingTop: 0,
          flexGrow: 1,
        }}
      >
        <View
          style={{
            flexGrow: 1,
          }}
        >
          {conditions && conditions.length > 0 && (
            <View
              style={{
                marginBottom: 10,
                marginLeft: 20,
                flexShrink: 0,
                flexDirection: 'row',
                spacing: 2,
              }}
            >
              <AppliedFilters
                conditions={conditions}
                onUpdate={onUpdateFilter}
                onDelete={onDeleteFilter}
                conditionsOp={conditionsOp}
                onConditionsOpChange={onConditionsOpChange}
              />
            </View>
          )}
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
                flexDirection: 'column',
                flexGrow: 1,
                padding: 10,
                paddingTop: 10,
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                }}
              >
                <View style={{ flex: 1 }} />
                <View
                  style={{
                    alignItems: 'flex-end',
                    color: theme.pageText,
                  }}
                >
                  <View>
                    {showCompareTo && (
                      <AlignedText
                        style={{ marginBottom: 5, minWidth: 210 }}
                        left={
                          <Block>
                            Spent {monthUtils.format(compare, 'MMM, yyyy')}
                            {compare === monthUtils.currentMonth() && ' MTD'}:
                          </Block>
                        }
                        right={
                          <Text style={{ fontWeight: 600 }}>
                            <PrivacyFilter blurIntensity={5}>
                              {amountToCurrency(
                                Math.abs(data.intervalData[todayDay].compare),
                              )}
                            </PrivacyFilter>
                          </Text>
                        }
                      />
                    )}
                    {mode === 'singleMonth' && (
                      <AlignedText
                        style={{ marginBottom: 5, minWidth: 210 }}
                        left={
                          <Block>
                            Spent {monthUtils.format(compareTo, 'MMM, yyyy')}:
                          </Block>
                        }
                        right={
                          <Text style={{ fontWeight: 600 }}>
                            <PrivacyFilter blurIntensity={5}>
                              {amountToCurrency(
                                Math.abs(data.intervalData[todayDay].compareTo),
                              )}
                            </PrivacyFilter>
                          </Text>
                        }
                      />
                    )}
                  </View>
                  <AlignedText
                    style={{ marginBottom: 5, minWidth: 210 }}
                    left={
                      <Block>
                        Budgeted
                        {compare === monthUtils.currentMonth() && ' MTD'}:
                      </Block>
                    }
                    right={
                      <Text style={{ fontWeight: 600 }}>
                        <PrivacyFilter blurIntensity={5}>
                          {amountToCurrency(
                            Math.abs(data.intervalData[todayDay].budget),
                          )}
                        </PrivacyFilter>
                      </Text>
                    }
                  />
                  {showAverage && (
                    <AlignedText
                      style={{ marginBottom: 5, minWidth: 210 }}
                      left={
                        <Block>
                          Spent Average
                          {compare === monthUtils.currentMonth() && ' MTD'}:
                        </Block>
                      }
                      right={
                        <Text style={{ fontWeight: 600 }}>
                          <PrivacyFilter blurIntensity={5}>
                            {amountToCurrency(
                              Math.abs(data.intervalData[todayDay].average),
                            )}
                          </PrivacyFilter>
                        </Text>
                      }
                    />
                  )}
                </View>
              </View>
              {!showCompare ||
              (mode === 'singleMonth' && !showCompareTo) ||
              (mode === 'average' && !showAverage) ? (
                <View style={{ marginTop: 20 }}>
                  <h1>Additional data required to generate graph</h1>
                  <Paragraph>
                    Currently, there is insufficient data to display selected
                    information regarding your spending. Please adjust selection
                    options to enable graph visualization.
                  </Paragraph>
                </View>
              ) : dataCheck ? (
                <SpendingGraph
                  style={{ flexGrow: 1 }}
                  compact={false}
                  data={data}
                  mode={mode}
                  compare={compare}
                  compareTo={compareTo}
                />
              ) : (
                <LoadingIndicator message="Loading report..." />
              )}
              {showAverage && (
                <View style={{ marginTop: 30 }}>
                  <Paragraph>
                    <strong>
                      How are “Average” and “Spent Average MTD” calculated?
                    </strong>
                  </Paragraph>
                  <Paragraph>
                    They are both the average cumulative spending by day for the
                    three months before the selected “compare” month.
                  </Paragraph>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </Page>
  );
}
