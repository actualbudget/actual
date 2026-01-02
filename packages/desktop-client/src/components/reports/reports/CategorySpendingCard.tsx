import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { Block } from '@actual-app/components/block';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { type RuleConditionEntity } from 'loot-core/types/models';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { DateRange } from '@desktop-client/components/reports/DateRange';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { ReportCard } from '@desktop-client/components/reports/ReportCard';
import { ReportCardName } from '@desktop-client/components/reports/ReportCardName';
import { DonutGraph } from '@desktop-client/components/reports/graphs/DonutGraph';
import { createCustomSpreadsheet } from '@desktop-client/components/reports/spreadsheets/custom-spreadsheet';
import { useReport } from '@desktop-client/components/reports/useReport';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { useFormat } from '@desktop-client/hooks/useFormat';

type CategorySpendingCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: {
    name?: string;
    timeFrame?: {
      start: string;
      end: string;
      mode: string;
    };
    conditions?: RuleConditionEntity[];
    conditionsOp?: 'and' | 'or';
  };
  onMetaChange: (newMeta: CategorySpendingCardProps['meta']) => void;
  onRemove: () => void;
};

export function CategorySpendingCard({
  widgetId,
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
}: CategorySpendingCardProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const categories = useCategories();
  const accounts = useAccounts();
  const payees = usePayees();

  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);

  // Default to current month if no timeFrame provided
  const startDate = meta?.timeFrame?.start || monthUtils.currentMonth();
  const endDate = meta?.timeFrame?.end || monthUtils.lastDayOfMonth(monthUtils.currentMonth());

  const getGraphData = useMemo(() => {
    return createCustomSpreadsheet({
      startDate,
      endDate,
      interval: 'Monthly',
      categories,
      conditions: meta?.conditions || [],
      conditionsOp: meta?.conditionsOp || 'and',
      showEmpty: false,
      showOffBudget: false,
      showHiddenCategories: false,
      showUncategorized: true,
      trimIntervals: false,
      groupBy: 'Category',
      balanceTypeOp: 'totalDebts',
      sortByOp: 'desc',
      payees,
      accounts,
      graphType: 'DonutGraph',
    });
  }, [startDate, endDate, categories, meta?.conditions, meta?.conditionsOp, payees, accounts]);

  const data = useReport('category-spending', getGraphData);

  // Get top categories sorted by amount with their colors from legend
  const sortedCategories = useMemo(() => {
    if (!data?.data || !data?.legend) return [];
    return [...data.data]
      .filter(item => item.totalDebts < 0)
      .sort((a, b) => a.totalDebts - b.totalDebts)
      .slice(0, 10)
      .map(item => {
        const legendItem = data.legend.find(l => l.id === item.id);
        return {
          ...item,
          color: legendItem?.color || theme.reportsBlue,
        };
      });
  }, [data]);

  const totalSpent = useMemo(() => {
    return sortedCategories.reduce((sum, cat) => sum + Math.abs(cat.totalDebts), 0);
  }, [sortedCategories]);

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/custom`}
      menuItems={[
        {
          name: 'rename',
          text: t('Rename'),
        },
        {
          name: 'remove',
          text: t('Remove'),
        },
      ]}
      onMenuSelect={item => {
        switch (item) {
          case 'rename':
            setNameMenuOpen(true);
            break;
          case 'remove':
            onRemove();
            break;
          default:
            throw new Error(`Unrecognized selection: ${item}`);
        }
      }}
    >
      <View
        style={{ flex: 1 }}
        onPointerEnter={() => setIsCardHovered(true)}
        onPointerLeave={() => setIsCardHovered(false)}
      >
        <View style={{ flexDirection: 'row', padding: 20, paddingBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <ReportCardName
              name={meta?.name || t('Spending by Category')}
              isEditing={nameMenuOpen}
              onChange={newName => {
                onMetaChange({
                  ...meta,
                  name: newName,
                });
                setNameMenuOpen(false);
              }}
              onClose={() => setNameMenuOpen(false)}
            />
            <DateRange start={startDate} end={endDate} />
          </View>
          <View style={{ textAlign: 'right' }}>
            <Block
              style={{
                ...styles.mediumText,
                fontWeight: 500,
                color: theme.errorText,
              }}
            >
              <PrivacyFilter activationFilters={[!isCardHovered]}>
                {format(totalSpent * -1, 'financial')}
              </PrivacyFilter>
            </Block>
          </View>
        </View>

        {data ? (
          <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' }}>
            {/* Pie Chart - 1/3 width */}
            <View style={{ flex: 1, minHeight: 200 }}>
              <DonutGraph
                style={{ flex: 1 }}
                data={data}
                filters={meta?.conditions || []}
                groupBy="Category"
                balanceTypeOp="totalDebts"
                viewLabels={false}
                showTooltip={true}
              />
            </View>

            {/* Category List - 2/3 width */}
            <View style={{ flex: 2, padding: '0 20px 20px 10px', overflow: 'auto' }}>
              {sortedCategories.map((category, index) => (
                <View
                  key={category.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: index < sortedCategories.length - 1 ? `1px solid ${theme.tableBorder}` : 'none',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        backgroundColor: theme.reportsBlue,
                      }}
                    />
                    <Block
                      style={{
                        ...styles.smallText,
                        color: theme.tableText,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {category.name}
                    </Block>
                  </View>
                  <PrivacyFilter activationFilters={[!isCardHovered]}>
                    <Block
                      style={{
                        ...styles.smallText,
                        fontWeight: 500,
                        color: theme.errorText,
                        marginLeft: 10,
                      }}
                    >
                      {format(Math.abs(category.totalDebts), 'financial')}
                    </Block>
                  </PrivacyFilter>
                </View>
              ))}
              {sortedCategories.length === 0 && (
                <View style={{ padding: 20, textAlign: 'center', color: theme.tableTextLight }}>
                  {t('No spending data')}
                </View>
              )}
            </View>
          </View>
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
