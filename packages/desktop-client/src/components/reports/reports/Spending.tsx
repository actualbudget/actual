import React, { useState, useMemo } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import { amountToCurrency } from 'loot-core/src/shared/util';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { useCategories } from '../../../hooks/useCategories';
import { useFilters } from '../../../hooks/useFilters';
import { SvgArrowLeft } from '../../../icons/v1/ArrowLeft';
import { theme, styles } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { Block } from '../../common/Block';
import { Link } from '../../common/Link';
import { Paragraph } from '../../common/Paragraph';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { AppliedFilters } from '../../filters/AppliedFilters';
import { FilterButton } from '../../filters/FiltersMenu';
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
  const [mode, setMode] = useState('Average');

  const getGraphData = useMemo(() => {
    setDataCheck(false);
    return createSpendingSpreadsheet({
      categories,
      conditions: filters,
      conditionsOp,
      setDataCheck,
    });
  }, [categories, filters, conditionsOp]);

  const data = useReport('default', getGraphData);

  if (!data) {
    return null;
  }

  return (
    <View style={{ ...styles.page, minWidth: 650, overflow: 'hidden' }}>
      <View
        style={{
          flexDirection: 'row',
          flexShrink: 0,
        }}
      >
        <View
          style={{
            padding: 10,
            paddingTop: 0,
            flexShrink: 0,
          }}
        >
          <Link
            variant="button"
            type="bare"
            to="/reports"
            style={{ marginBottom: '15', alignSelf: 'flex-start' }}
          >
            <SvgArrowLeft width={10} height={10} style={{ marginRight: 5 }} />{' '}
            Back
          </Link>
          <Text style={{ ...styles.veryLargeText, marginBottom: 10 }}>
            Monthly Spending Report
          </Text>

          {filters && (
            <View style={{ flexDirection: 'row' }}>
              <FilterButton
                onApply={onApplyFilter}
                compact={false}
                hover={false}
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
          padding: 15,
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
              flexGrow: 1,
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
                    left={<Block>Spent Average MTD:</Block>}
                    right={
                      <Text>
                        <PrivacyFilter blurIntensity={5}>
                          {amountToCurrency(
                            Math.abs(
                              data.intervalData[
                                monthUtils.getDay(monthUtils.currentDay()) - 1
                              ].average,
                            ),
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
                            Math.abs(
                              data.intervalData[
                                monthUtils.getDay(monthUtils.currentDay()) - 1
                              ].lastMonth,
                            ),
                          )}
                        </PrivacyFilter>
                      </Text>
                    }
                  />
                  <AlignedText
                    left={<Block>Spent MTD:</Block>}
                    right={
                      <Text>
                        <PrivacyFilter blurIntensity={5}>
                          {amountToCurrency(
                            Math.abs(
                              data.intervalData[
                                monthUtils.getDay(monthUtils.currentDay()) - 1
                              ].thisMonth,
                            ),
                          )}
                        </PrivacyFilter>
                      </Text>
                    }
                  />
                </View>
              </View>
              <View
                style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                }}
              >
                <ModeButton
                  selected={mode === 'Average'}
                  onSelect={() => setMode('Average')}
                >
                  3 month average
                </ModeButton>
                <ModeButton
                  selected={mode === 'Last Month'}
                  onSelect={() => setMode('Last Month')}
                >
                  Last month
                </ModeButton>
              </View>

              {dataCheck ? (
                <SpendingGraph
                  style={{ flexGrow: 1 }}
                  compact={false}
                  data={data}
                  mode={mode}
                />
              ) : (
                <LoadingIndicator message="Loading report..." />
              )}

              <View style={{ marginTop: 30 }}>
                <Paragraph>
                  <strong>How is three month average calculated?</strong>
                </Paragraph>
                <Paragraph>
                  Three month average takes the average cumulative spending from
                  the last three month and divides by three. If you do not have
                  3 months of data then please use the “Last month” graph until
                  you do.
                </Paragraph>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
