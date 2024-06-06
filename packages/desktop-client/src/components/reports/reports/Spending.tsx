import React, { useState, useMemo, useEffect } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import { amountToCurrency } from 'loot-core/src/shared/util';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { useCategories } from '../../../hooks/useCategories';
import { useFilters } from '../../../hooks/useFilters';
import { useNavigate } from '../../../hooks/useNavigate';
import { useResponsive } from '../../../ResponsiveProvider';
import { theme, styles } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { Block } from '../../common/Block';
import { Paragraph } from '../../common/Paragraph';
import { Text } from '../../common/Text';
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
  const categories = useCategories();

  const {
    filters,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onCondOpChange,
  } = useFilters<RuleConditionEntity>();

  const [dataCheck, setDataCheck] = useState(false);
  const [mode, setMode] = useState('Last month');

  const getGraphData = useMemo(() => {
    setDataCheck(false);
    return createSpendingSpreadsheet({
      categories,
      conditions: filters,
      conditionsOp,
      setDataCheck,
      mode,
    });
  }, [categories, filters, conditionsOp, mode]);

  const data = useReport('default', getGraphData);
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();

  const showAverage =
    data &&
    data.intervalData[27].months[
      monthUtils.subMonths(monthUtils.currentDay(), 3)
    ].daily !== 0;

  const todayDay =
    monthUtils.getDay(monthUtils.currentDay()) - 1 >= 28
      ? 27
      : monthUtils.getDay(monthUtils.currentDay()) - 1;

  const showLastYear = data && Math.abs(data.intervalData[27].lastYear) > 0;
  const showLastMonth = data && Math.abs(data.intervalData[27].lastMonth) > 0;

  if (!data) {
    return null;
  }
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
          flexDirection: 'row',
          flexShrink: 0,
        }}
      >
        <View
          style={{
            padding: 20,
            flexShrink: 0,
          }}
        >
          {filters && (
            <View style={{ flexDirection: 'row' }}>
              <FilterButton
                onApply={onApplyFilter}
                compact={false}
                hover={false}
                exclude={['date']}
              />
              <View style={{ flex: 1 }} />
            </View>
          )}
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
          {filters && filters.length > 0 && (
            <View
              style={{
                marginBottom: 10,
                marginLeft: 5,
                flexShrink: 0,
                flexDirection: 'row',
                spacing: 2,
                justifyContent: 'flex-start',
                alignContent: 'flex-start',
              }}
            >
              <AppliedFilters
                filters={filters}
                onUpdate={onUpdateFilter}
                onDelete={onDeleteFilter}
                conditionsOp={conditionsOp}
                onCondOpChange={onCondOpChange}
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
                  alignItems: 'flex-end',
                  paddingTop: 10,
                }}
              >
                <View
                  style={{
                    ...styles.mediumText,
                    fontWeight: 500,
                    marginBottom: 5,
                  }}
                >
                  <AlignedText
                    left={<Block>Spent MTD:</Block>}
                    right={
                      <Text>
                        <PrivacyFilter blurIntensity={5}>
                          {amountToCurrency(
                            Math.abs(data.intervalData[todayDay].thisMonth),
                          )}
                        </PrivacyFilter>
                      </Text>
                    }
                  />
                  <AlignedText
                    left={<Block>Spent Last MTD:</Block>}
                    right={
                      <Text>
                        <PrivacyFilter blurIntensity={5}>
                          {amountToCurrency(
                            Math.abs(data.intervalData[todayDay].lastMonth),
                          )}
                        </PrivacyFilter>
                      </Text>
                    }
                  />
                  {showAverage && (
                    <AlignedText
                      left={<Block>Spent Average MTD:</Block>}
                      right={
                        <Text>
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
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                }}
              >
                <Text
                  style={{
                    paddingRight: 10,
                  }}
                >
                  Compare this month to:
                </Text>
                {showLastMonth && (
                  <ModeButton
                    selected={mode === 'Last month'}
                    onSelect={() => setMode('Last month')}
                  >
                    Last month
                  </ModeButton>
                )}
                {showLastMonth && showLastYear && (
                  <ModeButton
                    selected={mode === 'Last year'}
                    onSelect={() => setMode('Last year')}
                  >
                    Last year
                  </ModeButton>
                )}
                {showLastMonth && showAverage && (
                  <ModeButton
                    selected={mode === 'Average'}
                    onSelect={() => setMode('Average')}
                  >
                    Average
                  </ModeButton>
                )}
              </View>
              {!showLastMonth && (
                <View style={{ marginTop: 30 }}>
                  <h1>Additional Data Required to Generate Graph</h1>
                  <Paragraph>
                    Currently, there is insufficient data to display any
                    information regarding your spending. Please input
                    transactions from last month to enable graph visualization.
                  </Paragraph>
                </View>
              )}

              {dataCheck ? (
                showLastMonth ? (
                  <SpendingGraph
                    style={{ flexGrow: 1 }}
                    compact={false}
                    data={data}
                    mode={mode}
                  />
                ) : null
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
