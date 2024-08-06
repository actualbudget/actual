import React, { useState, useMemo, useEffect } from 'react';

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
import { Button } from '../../common/Button';
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

export function Spending() {
  const {
    conditions,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onConditionsOpChange,
  } = useFilters<RuleConditionEntity>();

  const [spendingReportFilter = '', setSpendingReportFilter] = useLocalPref(
    'spendingReportFilter',
  );
  const [spendingReportTime = 'lastMonth', setSpendingReportTime] =
    useLocalPref('spendingReportTime');
  const [spendingReportCompare = 'thisMonth', setSpendingReportCompare] =
    useLocalPref('spendingReportCompare');

  const [dataCheck, setDataCheck] = useState(false);
  const [compare, setCompare] = useState(spendingReportCompare);
  const [mode, setMode] = useState(spendingReportTime);

  const parseFilter = spendingReportFilter && JSON.parse(spendingReportFilter);
  const filterSaved =
    JSON.stringify(parseFilter.conditions) === JSON.stringify(conditions) &&
    parseFilter.conditionsOp === conditionsOp &&
    spendingReportTime === mode &&
    spendingReportCompare === compare;

  useEffect(() => {
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
    });
  }, [conditions, conditionsOp, compare]);

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
    setSpendingReportTime(mode);
    setSpendingReportCompare(compare);
  };

  const showAverage =
    Math.abs(
      data.intervalData[27].months[
        monthUtils.subMonths(monthUtils.currentDay(), 3)
      ].cumulative,
    ) > 0;

  const todayDay =
    compare === 'lastMonth'
      ? 27
      : monthUtils.getDay(monthUtils.currentDay()) - 1 >= 28
        ? 27
        : monthUtils.getDay(monthUtils.currentDay()) - 1;

  const showLastYear =
    Math.abs(
      data.intervalData[27][
        compare === 'thisMonth' ? 'lastYear' : 'lastYearPrevious'
      ],
    ) > 0;
  const showPreviousMonth =
    Math.abs(data.intervalData[27][spendingReportTime]) > 0;
  return (
    <Page
      header={
        isNarrowWidth ? (
          <MobilePageHeader
            title="Monthly Spending"
            leftContent={
              <MobileBackButton onClick={() => navigate('/reports')} />
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
              if (mode === 'lastMonth') setMode('twoMonthsPrevious');
              if (mode === 'twoMonthsPrevious') setMode('lastMonth');
            }}
            options={[
              ['thisMonth', 'this month'],
              ['lastMonth', 'last month'],
            ]}
          />
          <Text
            style={{
              paddingRight: 10,
              paddingLeft: 5,
            }}
          >
            to the:
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            marginRight: 5,
            marginTop: 5,
            marginBottom: 5,
          }}
        >
          <ModeButton
            selected={['lastMonth', 'twoMonthsPrevious'].includes(mode)}
            style={{
              backgroundColor: 'inherit',
            }}
            onSelect={() =>
              setMode(
                compare === 'thisMonth' ? 'lastMonth' : 'twoMonthsPrevious',
              )
            }
          >
            Previous month
          </ModeButton>
          {showLastYear && (
            <ModeButton
              selected={mode === 'lastYear'}
              onSelect={() => setMode('lastYear')}
              style={{
                backgroundColor: 'inherit',
              }}
            >
              Last year
            </ModeButton>
          )}
          {showAverage && (
            <ModeButton
              selected={mode === 'average'}
              onSelect={() => setMode('average')}
              style={{
                backgroundColor: 'inherit',
              }}
            >
              Average
            </ModeButton>
          )}
        </View>
        {!isNarrowWidth && (
          <>
            <View
              style={{
                width: 1,
                height: 30,
                backgroundColor: theme.pillBorderDark,
                marginRight: 10,
              }}
            />{' '}
          </>
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
            placement="bottom start"
            content={<Text>Save compare and filter options</Text>}
            style={{
              ...styles.tooltip,
              lineHeight: 1.5,
              padding: '6px 10px',
              marginLeft: 10,
            }}
          >
            <Button
              type="primary"
              style={{
                marginLeft: 10,
              }}
              onClick={saveFilter}
              disabled={filterSaved ? true : false}
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
                  {showPreviousMonth && (
                    <View>
                      <AlignedText
                        style={{ marginBottom: 5, minWidth: 210 }}
                        left={
                          <Block>
                            Spent{' '}
                            {compare === 'thisMonth' ? 'MTD' : 'Last Month'}:
                          </Block>
                        }
                        right={
                          <Text style={{ fontWeight: 600 }}>
                            <PrivacyFilter blurIntensity={5}>
                              {amountToCurrency(
                                Math.abs(
                                  data.intervalData[todayDay][
                                    compare === 'thisMonth'
                                      ? 'thisMonth'
                                      : 'lastMonth'
                                  ],
                                ),
                              )}
                            </PrivacyFilter>
                          </Text>
                        }
                      />
                      <AlignedText
                        style={{ marginBottom: 5, minWidth: 210 }}
                        left={
                          <Block>
                            Spent{' '}
                            {compare === 'thisMonth'
                              ? ' Last MTD'
                              : '2 Months Ago'}
                            :
                          </Block>
                        }
                        right={
                          <Text style={{ fontWeight: 600 }}>
                            <PrivacyFilter blurIntensity={5}>
                              {amountToCurrency(
                                Math.abs(
                                  data.intervalData[todayDay][
                                    compare === 'thisMonth'
                                      ? 'lastMonth'
                                      : 'twoMonthsPrevious'
                                  ],
                                ),
                              )}
                            </PrivacyFilter>
                          </Text>
                        }
                      />
                    </View>
                  )}
                  {showAverage && (
                    <AlignedText
                      style={{ marginBottom: 5, minWidth: 210 }}
                      left={
                        <Block>
                          Spent Average{compare === 'thisMonth' && ' MTD'}:
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
              {!showPreviousMonth ? (
                <View style={{ marginTop: 20 }}>
                  <h1>Additional data required to generate graph</h1>
                  <Paragraph>
                    Currently, there is insufficient data to display any
                    information regarding your spending. Please input
                    transactions from last month to enable graph visualization.
                  </Paragraph>
                </View>
              ) : dataCheck ? (
                <SpendingGraph
                  style={{ flexGrow: 1 }}
                  compact={false}
                  data={data}
                  mode={mode}
                  compare={compare}
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
                    last three months.
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
