import React, { useState, useEffect, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { integerToCurrency } from 'loot-core/shared/util';

import { TemplateModal } from './TemplateModal';

import { useCategories } from '@desktop-client/hooks/useCategories';

type CategoryProjection = {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
  projectedAmount: number;
  budgetedAmount: number;
  isIncome: boolean;
};

type MonthProjection = {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  categories: Record<string, CategoryProjection>;
  cumulativeIncome: number;
  cumulativeExpenses: number;
  cumulativeSavings: number;
  projectedBalance: number;
  beginningBalance: number;
};

type ProjectionSummary = {
  currentBalance: number;
  finalBalance: number;
  totalProjectedIncome: number;
  totalProjectedExpenses: number;
  totalProjectedSavings: number;
  netChange: number;
};

type ProjectionData = {
  projections: Record<string, MonthProjection>;
  summary: ProjectionSummary;
};

export function Future() {
  const { t } = useTranslation();
  const [currentMonth] = useState(monthUtils.currentMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [futureMonths, setFutureMonths] = useState<string[]>([]);
  const [projections, setProjections] = useState<
    Record<string, MonthProjection>
  >({});
  const [summary, setSummary] = useState<ProjectionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<
    Array<{
      month: string;
      income: number;
      expenses: number;
      projectedBalance: number;
    }>
  >([]);
  const [projectionType, setProjectionType] = useState<'average' | 'manual'>(
    'average',
  );
  const [templates, setTemplates] = useState<
    Array<{
      id: string;
      name: string;
      template: Record<string, number>;
      created_at: string;
    }>
  >([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [manualCategoryValues, setManualCategoryValues] = useState<
    Record<string, Record<string, number>>
  >({});
  const [manualIncomeValues, setManualIncomeValues] = useState<
    Record<string, Record<string, number>>
  >({});
  const { grouped: categoryGroups } = useCategories();

  const loadTemplates = useCallback(async () => {
    try {
      const templatesData = JSON.parse(
        localStorage.getItem('futureTemplates') || '[]',
      );
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    }
  }, []);

  const loadTemplateValues = useCallback(
    async (templateId: string) => {
      if (!templateId) {
        setManualCategoryValues({});
        setManualIncomeValues({});
        return;
      }

      try {
        const template = templates.find(t => t.id === templateId);
        if (template) {
          const templateData = template.template;

          // Apply template values to all future months
          const newManualValues: Record<string, Record<string, number>> = {};
          const newManualIncomeValues: Record<
            string,
            Record<string, number>
          > = {};
          futureMonths.forEach(month => {
            newManualValues[month] = {};
            newManualIncomeValues[month] = {};

            // Separate income and expense categories
            Object.entries(templateData).forEach(([categoryId, amount]) => {
              const category = categoryGroups
                .find(g => g.categories?.find(c => c.id === categoryId))
                ?.categories?.find(c => c.id === categoryId);

              if (category?.is_income) {
                newManualIncomeValues[month][categoryId] = amount;
              } else {
                newManualValues[month][categoryId] = amount;
              }
            });
          });

          setManualCategoryValues(newManualValues);
          setManualIncomeValues(newManualIncomeValues);
        }
      } catch (error) {
        console.error('Error loading template values:', error);
      }
    },
    [templates, futureMonths, categoryGroups],
  );

  useEffect(() => {
    if (projectionType === 'manual' && selectedTemplate) {
      loadTemplateValues(selectedTemplate);
    } else if (projectionType === 'average') {
      setManualCategoryValues({});
      setManualIncomeValues({});
    }
  }, [projectionType, selectedTemplate, loadTemplateValues]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    // Calculate months for the full year
    const months = [];

    // Add all months from January to December of current year
    for (let month = 0; month < 12; month++) {
      const monthStr = monthUtils.format(
        new Date(currentYear, month, 1),
        'yyyy-MM',
      );
      months.push(monthStr);
    }

    setFutureMonths(months);
  }, [currentYear]);

  const loadHistoricalData = useCallback(async () => {
    try {
      const currentMonth = monthUtils.currentMonth();

      // Get historical data for months before current month in the current year
      const months = [];
      for (let month = 0; month < 12; month++) {
        const monthStr = monthUtils.format(
          new Date(currentYear, month, 1),
          'yyyy-MM',
        );
        if (monthStr < currentMonth) {
          months.push(monthStr);
        }
      }

      const historicalData = await send('get-historical-budget-data', {
        months,
      });

      return historicalData;
    } catch (error) {
      console.error('Error loading historical data:', error);
      return [];
    }
  }, [currentYear]);

  const loadProjections = useCallback(async () => {
    try {
      setLoading(true);
      if (futureMonths.length === 0) return;

      const projectionsData: ProjectionData = await send(
        'get-future-budget-projections',
        {
          periods: futureMonths,
          timePeriod: 'months',
          projectionType,
          templateId: selectedTemplate,
          manualValues:
            projectionType === 'manual' ? manualCategoryValues : undefined,
          manualIncomeValues:
            projectionType === 'manual' ? manualIncomeValues : undefined,
        },
      );
      setProjections(projectionsData.projections);
      setSummary(projectionsData.summary);

      // Create chart data using only projections data to match monthly view
      const chartData = createChartData([], projectionsData);
      setChartData(chartData);
    } catch (error) {
      console.error('Error loading projections:', error);
    } finally {
      setLoading(false);
    }
  }, [
    futureMonths,
    projectionType,
    selectedTemplate,
    manualCategoryValues,
    manualIncomeValues,
  ]);

  const createChartData = (
    historical: Array<{
      month: string;
      income: number;
      expenses: number;
      projectedBalance: number;
    }>,
    projections: ProjectionData,
  ) => {
    const chartData = [];
    const currentMonth = monthUtils.currentMonth();

    // Use only the projections data for ALL months to ensure consistency with monthly view
    // This ensures the chart uses exactly the same projected balance values as the monthly view
    Object.entries(projections.projections).forEach(([period, projection]) => {
      const hasData = projection.income > 0 || projection.expenses > 0;
      if (hasData) {
        const periodLabel = monthUtils.format(period, 'MMM');

        chartData.push({
          month: periodLabel,
          income: projection.income || 0,
          expenses: projection.expenses || 0,
          projectedBalance: projection.projectedBalance || 0,
          type: period === currentMonth ? 'current' : period < currentMonth ? 'historical' : 'projected',
        });
      }
    });

    return chartData.sort((a, b) => {
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return months.indexOf(a.month) - months.indexOf(b.month);
    });
  };

  useEffect(() => {
    if (futureMonths.length > 0) {
      loadProjections();
    }
  }, [futureMonths, projectionType, loadProjections]);

  const toggleProjectionType = () => {
    setProjectionType(prev => (prev === 'average' ? 'manual' : 'average'));
  };

  const formatCurrency = (amount: number) => {
    return integerToCurrency(Math.round(amount));
  };

  const getGroupedCategories = (monthProjection: MonthProjection) => {
    const grouped: Record<string, CategoryProjection[]> = {};

    // Include all categories from categoryGroups, even if they're not in monthProjection
    if (categoryGroups) {
      categoryGroups.forEach(group => {
        if (group.categories) {
          grouped[group.id] = group.categories.map(category => {
            // Check if this category exists in monthProjection
            const existingCategory = monthProjection.categories[category.id];
            if (existingCategory) {
              return existingCategory;
            } else {
              // Create a default category projection for categories not in monthProjection
              return {
                id: category.id,
                name: category.name,
                groupId: group.id,
                groupName: group.name,
                projectedAmount: 0,
                budgetedAmount: 0,
                isIncome: category.is_income,
              };
            }
          });
        }
      });
    }

    return grouped;
  };

  const updateManualCategoryValue = (
    month: string,
    categoryId: string,
    value: number,
  ) => {
    setManualCategoryValues(prev => ({
      ...prev,
      [month]: {
        ...prev[month],
        [categoryId]: value,
      },
    }));
  };

  const updateManualIncomeValue = (
    month: string,
    categoryId: string,
    value: number,
  ) => {
    setManualIncomeValues(prev => ({
      ...prev,
      [month]: {
        ...prev[month],
        [categoryId]: value,
      },
    }));
  };

  const getManualCategoryValue = (
    month: string,
    categoryId: string,
    defaultValue: number,
  ) => {
    if (
      projectionType === 'manual' &&
      manualCategoryValues[month] &&
      manualCategoryValues[month][categoryId] !== undefined
    ) {
      return manualCategoryValues[month][categoryId];
    }
    return defaultValue;
  };

  const getManualIncomeValue = (
    month: string,
    categoryId: string,
    defaultValue: number,
  ) => {
    if (
      projectionType === 'manual' &&
      manualIncomeValues[month] &&
      manualIncomeValues[month][categoryId] !== undefined
    ) {
      return manualIncomeValues[month][categoryId];
    }
    return defaultValue;
  };

  if (loading) {
    return (
      <View style={{ ...styles.page, paddingLeft: 8, paddingRight: 8 }}>
        <Text style={{ textAlign: 'center', marginTop: 50 }}>
          {t('Loading projections...')}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        ...styles.page,
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 16,
        paddingBottom: 32,
        minHeight: 'auto',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          padding: 20,
          backgroundColor: theme.tableBackground,
          borderRadius: 8,
          minHeight: 70,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <Text
            style={{ fontSize: 20, fontWeight: 'bold', color: theme.tableText }}
          >
            {t('Future Budget Projections')}
          </Text>

          {/* Year Navigation */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Button
              type="bare"
              onClick={() => setCurrentYear(prev => prev - 1)}
              style={{
                backgroundColor: theme.buttonNormalBackground,
                color: theme.buttonNormalText,
                padding: '6px 12px',
                borderRadius: 4,
                fontSize: 14,
                minHeight: 30,
              }}
            >
              ‹
            </Button>
            <Text
              style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: theme.tableText,
                minWidth: 60,
                textAlign: 'center',
              }}
            >
              {currentYear}
            </Text>
            <Button
              type="bare"
              onClick={() => setCurrentYear(prev => prev + 1)}
              style={{
                backgroundColor: theme.buttonNormalBackground,
                color: theme.buttonNormalText,
                padding: '6px 12px',
                borderRadius: 4,
                fontSize: 14,
                minHeight: 30,
              }}
            >
              ›
            </Button>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Button
            type="bare"
            onClick={toggleProjectionType}
            style={{
              backgroundColor: theme.buttonNormalBackground,
              color: theme.buttonNormalText,
              padding: '10px 18px',
              borderRadius: 6,
              fontSize: 14,
              minHeight: 36,
            }}
          >
            {projectionType === 'average' ? t('3-Month Average') : t('Manual')}
          </Button>

          {projectionType === 'manual' && (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <select
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                style={{
                  backgroundColor: theme.buttonNormalBackground,
                  color: theme.buttonNormalText,
                  padding: '10px 16px',
                  borderRadius: 6,
                  border: 'none',
                  minWidth: 140,
                  fontSize: 14,
                  minHeight: 36,
                }}
              >
                <option value="">{t('Select Template')}</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <Button
                type="bare"
                onClick={() => setShowTemplateModal(true)}
                style={{
                  backgroundColor: theme.buttonNormalBackground,
                  color: theme.buttonNormalText,
                  padding: '10px 18px',
                  borderRadius: 6,
                  fontSize: 14,
                  minHeight: 36,
                }}
              >
                {t('Manage Templates')}
              </Button>
            </View>
          )}
        </View>
      </View>

      <View>
        {/* Financial Summary Section */}
        {summary && (
          <View
            style={{
              backgroundColor: theme.tableBackground,
              borderRadius: 6,
              padding: 20,
              marginBottom: 20,
              borderLeft: `4px solid ${theme.noticeText}`,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: 'bold',
                marginBottom: 15,
                color: theme.tableText,
              }}
            >
              {t('Annual Financial Projection')}
            </Text>

            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 20,
                flexWrap: 'wrap',
              }}
            >
              <View
                style={{
                  flex: 1,
                  minWidth: 240,
                  padding: 10,
                  backgroundColor: theme.pageBackground,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: theme.tableText,
                    marginBottom: 12,
                    lineHeight: 1.4,
                  }}
                >
                  {t('Current Position')}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    alignItems: 'center',
                    minHeight: 20,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.tableText,
                      lineHeight: 1.3,
                    }}
                  >
                    {t('Current Balance')}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.tableText,
                      lineHeight: 1.3,
                    }}
                  >
                    {formatCurrency(summary.currentBalance)}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flex: 1,
                  minWidth: 240,
                  padding: 10,
                  backgroundColor: theme.pageBackground,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: theme.tableText,
                    marginBottom: 12,
                    lineHeight: 1.4,
                  }}
                >
                  {t('Year-End Totals')}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    alignItems: 'center',
                    minHeight: 20,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.tableText,
                      lineHeight: 1.3,
                    }}
                  >
                    {t('Total Income')}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.noticeText,
                      lineHeight: 1.3,
                    }}
                  >
                    {formatCurrency(summary.totalProjectedIncome)}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    alignItems: 'center',
                    minHeight: 20,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.tableText,
                      lineHeight: 1.3,
                    }}
                  >
                    {t('Total Expenses')}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.errorText,
                      lineHeight: 1.3,
                    }}
                  >
                    {formatCurrency(summary.totalProjectedExpenses)}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flex: 1,
                  minWidth: 240,
                  padding: 10,
                  backgroundColor: theme.pageBackground,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: theme.tableText,
                    marginBottom: 12,
                    lineHeight: 1.4,
                  }}
                >
                  {t('Projected End Position')}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    alignItems: 'center',
                    minHeight: 20,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.tableText,
                      lineHeight: 1.3,
                    }}
                  >
                    {t('Final Balance')}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: 'bold',
                      color:
                        summary.finalBalance >= summary.currentBalance
                          ? theme.upcomingText
                          : theme.errorText,
                      lineHeight: 1.3,
                    }}
                  >
                    {formatCurrency(summary.finalBalance)}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    alignItems: 'center',
                    minHeight: 20,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.tableText,
                      lineHeight: 1.3,
                    }}
                  >
                    {t('Net Change')}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: 'bold',
                      color:
                        (summary.totalProjectedIncome - summary.totalProjectedExpenses) >= 0
                          ? theme.upcomingText
                          : theme.errorText,
                      lineHeight: 1.3,
                    }}
                  >
                    {(summary.totalProjectedIncome - summary.totalProjectedExpenses) >= 0 ? '+' : ''}
                    {formatCurrency(summary.totalProjectedIncome - summary.totalProjectedExpenses)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Monthly Projections Cards */}
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 20,
            marginBottom: 24,
            overflowX: 'auto',
            minHeight: 'auto',
            paddingBottom: 4,
            flexWrap: 'nowrap',
          }}
        >
          {futureMonths.map((month, index) => {
            const monthProjection = projections[month];
            if (!monthProjection) return null;

            // Check if month has data (income > 0 or expenses > 0)
            const hasData = monthProjection.income > 0 || monthProjection.expenses > 0;
            
            if (!hasData) {
              return (
                <View
                  key={month}
                  style={{
                    minWidth: 280,
                    maxWidth: 320,
                    width: 'auto',
                    backgroundColor: theme.tableBackground,
                    borderRadius: 6,
                    padding: 20,
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    minHeight: 'auto',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: month === currentMonth ? theme.noticeText : theme.tableText,
                      lineHeight: 1.5,
                      marginBottom: 8,
                      textAlign: 'center',
                    }}
                  >
                    {monthUtils.format(month, 'MMM yyyy')}
                    {month === currentMonth && ' (Current)'}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: theme.tableText,
                      textAlign: 'center',
                      fontStyle: 'italic',
                      padding: 20,
                    }}
                  >
                    {t('No data for this month')}
                  </Text>
                </View>
              );
            }

            const groupedCategories = getGroupedCategories(monthProjection);

            return (
              <View
                key={month}
                style={{
                  minWidth: 280,
                  maxWidth: 320,
                  width: 'auto',
                  backgroundColor: theme.tableBackground,
                  borderRadius: 6,
                  padding: 20,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  minHeight: 'auto',
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: index === 0 ? theme.noticeText : theme.tableText,
                    lineHeight: 1.5,
                    marginBottom: 8,
                  }}
                >
                  {monthUtils.format(month, 'MMM yyyy')}
                  {month === currentMonth && (
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: 'normal',
                        display: 'block',
                      }}
                    >
                      {' (Current)'}
                    </Text>
                  )}
                </Text>

                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: 'bold',
                      color: theme.tableText,
                      marginBottom: 10,
                    }}
                  >
                    {t('Monthly Budget')}
                  </Text>
                  <View style={{ gap: 8 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        minHeight: 20,
                      }}
                    >
                      <Text style={{ fontSize: 13, color: theme.tableText }}>
                        {t('Projected Income')}
                      </Text>
                      {projectionType === 'manual' && month >= currentMonth ? (
                        <input
                          type="text"
                          value={
                            // Calculate total income from individual categories
                            Object.values(monthProjection.categories)
                              .filter(cat => cat.isIncome)
                              .reduce(
                                (sum, cat) =>
                                  sum +
                                  getManualIncomeValue(
                                    month,
                                    cat.id,
                                    cat.projectedAmount,
                                  ),
                                0,
                              ) / 100
                          }
                          onChange={e => {
                            const newTotalIncome =
                              parseFloat(e.target.value) || 0;
                            const currentTotalIncome =
                              Object.values(monthProjection.categories)
                                .filter(cat => cat.isIncome)
                                .reduce(
                                  (sum, cat) =>
                                    sum +
                                    getManualIncomeValue(
                                      month,
                                      cat.id,
                                      cat.projectedAmount,
                                    ),
                                  0,
                                ) / 100;

                            // Apply proportional change to all income categories
                            const ratio =
                              newTotalIncome / (currentTotalIncome || 1);
                            Object.values(monthProjection.categories)
                              .filter(cat => cat.isIncome)
                              .forEach(cat => {
                                const currentValue = getManualIncomeValue(
                                  month,
                                  cat.id,
                                  cat.projectedAmount,
                                );
                                updateManualIncomeValue(
                                  month,
                                  cat.id,
                                  currentValue * ratio,
                                );
                              });
                          }}
                          style={{
                            width: '80px',
                            fontSize: '13px',
                            padding: '4px 8px',
                            backgroundColor: theme.buttonNormalBackground,
                            color: theme.buttonNormalText,
                            border: 'none',
                            borderRadius: '3px',
                            textAlign: 'right',
                            WebkitAppearance: 'none',
                            MozAppearance: 'textfield',
                            minHeight: '20px',
                          }}
                        />
                      ) : (
                        <Text
                          style={{
                            fontSize: 13,
                            color: theme.noticeText,
                            fontWeight: '500',
                          }}
                        >
                          {formatCurrency(
                            // Calculate projected income as sum of individual category projections
                            Object.values(monthProjection.categories)
                              .filter(cat => cat.isIncome)
                              .reduce((sum, cat) => sum + cat.projectedAmount, 0)
                          )}
                        </Text>
                      )}
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        minHeight: 20,
                      }}
                    >
                      <Text style={{ fontSize: 13, color: theme.tableText }}>
                        {t('Projected Expenses')}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: theme.errorText,
                          fontWeight: '500',
                        }}
                      >
                        {formatCurrency(
                          // Calculate projected expenses as sum of individual category projections
                          Object.values(monthProjection.categories)
                            .filter(cat => !cat.isIncome)
                            .reduce((sum, cat) => sum + cat.projectedAmount, 0)
                        )}
                      </Text>
                    </View>
                  </View>
                </View>

                <View
                  style={{
                    borderTop: `1px solid ${theme.tableBorderColor}`,
                    paddingTop: 15,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: 'bold',
                      color: theme.tableText,
                      marginBottom: 10,
                    }}
                  >
                    {t('Cumulative Totals')}
                  </Text>
                  <View style={{ gap: 8 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        minHeight: 20,
                      }}
                    >
                      <Text style={{ fontSize: 13, color: theme.tableText }}>
                        {t('Monthly Net')}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '500',
                          color:
                            monthProjection.savings >= 0
                              ? theme.upcomingText
                              : theme.errorText,
                        }}
                      >
                        {formatCurrency(monthProjection.savings)}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        minHeight: 20,
                      }}
                    >
                      <Text style={{ fontSize: 13, color: theme.tableText }}>
                        {t('Cumulative Net')}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '500',
                          color:
                            monthProjection.cumulativeSavings >= 0
                              ? theme.upcomingText
                              : theme.errorText,
                        }}
                      >
                        {formatCurrency(monthProjection.cumulativeSavings)}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        minHeight: 20,
                      }}
                    >
                      <Text style={{ fontSize: 13, color: theme.tableText }}>
                        {t('Beginning Balance')}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '500',
                          color: theme.tableText,
                        }}
                      >
                        {formatCurrency(monthProjection.beginningBalance || 0)}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        minHeight: 20,
                      }}
                    >
                      <Text style={{ fontSize: 13, color: theme.tableText }}>
                        {t('Projected Balance')}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '500',
                          color: theme.tableText,
                        }}
                      >
                        {formatCurrency(monthProjection.projectedBalance)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ flex: 1, minHeight: 300 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: 'bold',
                      color: theme.tableText,
                      marginBottom: 12,
                    }}
                  >
                    <Trans>Categories</Trans>
                  </Text>
                  <View style={{ flex: 1, overflow: 'auto' }}>
                    {categoryGroups &&
                      categoryGroups.map(group => (
                        <View key={group.id} style={{ marginBottom: 16 }}>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: 'bold',
                              color: theme.tableText,
                              marginBottom: 8,
                            }}
                          >
                            {group.name}
                          </Text>
                          <View style={{ gap: 6 }}>
                            {(groupedCategories[group.id] || [])
                              .map(category => (
                                <View
                                  key={category.id}
                                  style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingLeft: 10,
                                    paddingVertical: 6,
                                    minHeight: 28,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      color: theme.tableText,
                                      flex: 1,
                                      textAlign: 'left',
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    {category.name}
                                  </Text>
                                  {projectionType === 'manual' && month >= currentMonth ? (
                                    <input
                                      type="text"
                                      value={
                                        getManualCategoryValue(
                                          month,
                                          category.id,
                                          category.projectedAmount,
                                        ) / 100
                                      }
                                      onChange={e => {
                                        const value =
                                          parseFloat(e.target.value) || 0;
                                        updateManualCategoryValue(
                                          month,
                                          category.id,
                                          value * 100,
                                        );
                                      }}
                                      style={{
                                        width: '70px',
                                        fontSize: '11px',
                                        padding: '4px 6px',
                                        backgroundColor:
                                          theme.buttonNormalBackground,
                                        color: theme.buttonNormalText,
                                        border: 'none',
                                        borderRadius: '3px',
                                        textAlign: 'right',
                                        WebkitAppearance: 'none',
                                        MozAppearance: 'textfield',
                                        minHeight: '20px',
                                      }}
                                    />
                                  ) : (
                                    <Text
                                      style={{
                                        fontSize: 11,
                                        color: theme.tableText,
                                        marginLeft: 8,
                                        fontWeight: '500',
                                      }}
                                    >
                                      {formatCurrency(category.projectedAmount)}
                                    </Text>
                                  )}
                                </View>
                              ))}
                          </View>
                        </View>
                      ))}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Chart Section */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 8,
            padding: 24,
            marginBottom: 24,
            height: 320,
            border: `1px solid ${theme.tableBorderColor}`,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 20,
              color: theme.tableText,
            }}
          >
            {t('Income vs Expenses vs Projected Balance')} -{' '}
            <Trans>Monthly</Trans>
          </Text>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={value =>
                  integerToCurrency(Math.round(value || 0))
                }
              />
              <Tooltip
                formatter={(value, name) => {
                  const numValue = value as number;
                  // Values are already in cents, so pass directly to integerToCurrency
                  const roundedValue = Math.round(numValue || 0);
                  let label = '';
                  switch (name) {
                    case 'income':
                      label = t('Income');
                      break;
                    case 'expenses':
                      label = t('Expenses');
                      break;
                    case 'projectedBalance':
                      label = t('Projected Balance');
                      break;
                    default:
                      label = name;
                  }
                  return [integerToCurrency(roundedValue), label];
                }}
              />
              <Line
                type="monotone"
                dataKey="income"
                stroke={theme.noticeText}
                strokeWidth={2}
                dot={{ fill: theme.noticeText }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke={theme.errorText}
                strokeWidth={2}
                dot={{ fill: theme.errorText }}
              />
              <Line
                type="monotone"
                dataKey="projectedBalance"
                stroke={theme.buttonPrimaryBackground}
                strokeWidth={2}
                dot={{ fill: theme.buttonPrimaryBackground }}
              />
            </LineChart>
          </ResponsiveContainer>
        </View>

        {/* Transaction Management Container */}
        <View
          style={{
            backgroundColor: theme.tableBackground,
            borderRadius: 8,
            padding: 24,
            marginTop: 24,
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 16,
              color: theme.tableText,
            }}
          >
            {t('Additional Transactions')}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.tableText,
              marginBottom: 20,
              lineHeight: 1.4,
            }}
          >
            <Trans>
              Add planned transactions that will be included in the projections
              but not saved to your budget.
            </Trans>
          </Text>

          {/* Future implementation: Transaction entry form */}
          <View
            style={{
              padding: 24,
              backgroundColor: theme.pageBackground,
              borderRadius: 6,
              border: `2px dashed ${theme.tableBorderColor}`,
              textAlign: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: theme.tableText,
                fontStyle: 'italic',
              }}
            >
              <Trans>Transaction management will be implemented here</Trans>
            </Text>
          </View>
        </View>
      </View>

      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onTemplateChange={loadTemplates}
        templates={templates}
      />
    </View>
  );
}
