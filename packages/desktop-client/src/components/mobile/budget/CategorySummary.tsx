import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgChartPie } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import type { CategoryEntity } from '@actual-app/core/types/models';

import { makeBalanceAmountStyle } from '#components/budget/util';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useBudgetBindings } from '#hooks/useBudgetBindings';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useFormat } from '#hooks/useFormat';
import { useNotes } from '#hooks/useNotes';
import { useSheetValue } from '#hooks/useSheetValue';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { LABEL_STYLE, ROW_PADDING_X } from './budgetTableStyles';
import { CategorySpendingHistory } from './CategorySpendingHistory';
import { MobileCarryoverIndicator } from './MobileCarryoverIndicator';

type CategorySummaryProps = {
  category: CategoryEntity;
  month: string;
  onEditBudget: () => void;
  onEditAutomations: () => void;
};

export function CategorySummary({
  category,
  month,
  onEditBudget,
  onEditAutomations,
}: CategorySummaryProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const note = useNotes(category.id);
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const isTracking = budgetType === 'tracking';
  const bindings = useBudgetBindings();
  const goalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const goalTemplatesUIEnabled = useFeatureFlag('goalTemplatesUIEnabled');

  const budgeted =
    useSheetValue<'envelope-budget' | 'tracking-budget', 'budget'>(
      bindings.catBudgeted(category.id),
    ) ?? 0;
  const spent =
    useSheetValue<'envelope-budget' | 'tracking-budget', 'sum-amount'>(
      bindings.catSumAmount(category.id),
    ) ?? 0;
  const balance =
    useSheetValue<'envelope-budget' | 'tracking-budget', 'leftover'>(
      bindings.catBalance(category.id),
    ) ?? 0;
  const goal = useSheetValue<'envelope-budget' | 'tracking-budget', 'goal'>(
    bindings.catGoal(category.id),
  );
  const carryover = useSheetValue<
    'envelope-budget' | 'tracking-budget',
    'carryover'
  >(bindings.catCarryover(category.id));

  const automationCount = countAutomations(category);
  const showAutomations =
    goalTemplatesEnabled &&
    goalTemplatesUIEnabled &&
    !(category.is_income && !isTracking) &&
    automationCount > 0;

  const showBudgeted = isTracking || !category.is_income;
  const showSpent = !category.is_income;
  const heroValue = category.is_income ? spent : balance;
  const balanceStyle = category.is_income
    ? makeBalanceAmountStyle(spent)
    : makeBalanceAmountStyle(balance, goal, budgeted);
  const tileLabelStyle = {
    ...LABEL_STYLE,
    textAlign: 'center',
  } satisfies CSSProperties;
  const tileValueStyle = {
    ...styles.tnum,
    ...styles.mediumText,
    fontWeight: 700,
    color: theme.pageTextDark,
    marginTop: spacing.xxs,
  } satisfies CSSProperties;

  return (
    <View style={{ flexShrink: 0, backgroundColor: theme.tableBackground }}>
      <View
        style={{
          alignItems: 'center',
          padding: `${spacing.lg}px ${ROW_PADDING_X}px ${spacing.md}px`,
          borderBottomWidth: 1,
          borderColor: theme.tableBorder,
        }}
      >
        <Text style={LABEL_STYLE}>
          {category.is_income ? t('Received') : t('Balance')}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginTop: spacing.xxs,
          }}
        >
          <PrivacyFilter>
            <Text
              data-testid="category-balance"
              style={{
                ...styles.tnum,
                ...styles.veryLargeText,
                fontWeight: 800,
                letterSpacing: -0.8,
                ...balanceStyle,
              }}
            >
              {format(heroValue, 'financial')}
            </Text>
          </PrivacyFilter>
          {carryover && <MobileCarryoverIndicator style={balanceStyle} />}
        </View>
        {note && (
          <Text
            style={{
              ...styles.verySmallText,
              fontStyle: 'italic',
              color: theme.pageTextLight,
              marginTop: spacing.sm,
              textAlign: 'center',
            }}
          >
            {note}
          </Text>
        )}
      </View>

      {(showBudgeted || showSpent) && (
        <View
          style={{
            display: 'grid',
            gridTemplateColumns: showBudgeted && showSpent ? '1fr 1fr' : '1fr',
            borderBottomWidth: 1,
            borderColor: theme.tableBorder,
          }}
        >
          {showBudgeted && (
            <Button
              variant="bare"
              onPress={onEditBudget}
              aria-label={t(
                'Edit budgeted amount for {{categoryName}} category, currently {{amount}}',
                {
                  categoryName: category.name,
                  amount: format(budgeted, 'financial'),
                },
              )}
              style={{
                flexDirection: 'column',
                padding: spacing.md,
                borderRadius: 0,
                borderRight: showSpent
                  ? `1px solid ${theme.tableBorder}`
                  : undefined,
              }}
            >
              <Text style={tileLabelStyle}>
                <Trans>Budgeted</Trans>
              </Text>
              <PrivacyFilter>
                <Text
                  style={{
                    ...tileValueStyle,
                    textDecoration: 'underline dotted',
                    textDecorationColor: theme.buttonPrimaryBackground,
                    textUnderlineOffset: 4,
                  }}
                >
                  {format(budgeted, 'financial')}
                </Text>
              </PrivacyFilter>
            </Button>
          )}
          {showSpent && (
            <View style={{ alignItems: 'center', padding: spacing.md }}>
              <Text style={tileLabelStyle}>
                <Trans>Spent</Trans>
              </Text>
              <PrivacyFilter>
                <Text style={tileValueStyle}>{format(spent, 'financial')}</Text>
              </PrivacyFilter>
            </View>
          )}
        </View>
      )}

      {showAutomations && (
        <Button
          variant="bare"
          onPress={onEditAutomations}
          style={{
            width: '100%',
            gap: spacing.sm,
            padding: `${spacing.md}px ${ROW_PADDING_X}px`,
            borderRadius: 0,
            borderBottom: `1px solid ${theme.tableBorder}`,
            justifyContent: 'flex-start',
          }}
        >
          <SvgChartPie
            width={13}
            height={13}
            style={{ color: theme.pageTextLink, flexShrink: 0 }}
          />
          <Text
            style={{
              ...styles.smallText,
              fontWeight: 600,
              color: theme.tableText,
              flex: 1,
              textAlign: 'left',
            }}
          >
            {t('{{count}} automations active', { count: automationCount })}
          </Text>
          <Text
            style={{
              ...styles.verySmallText,
              fontWeight: 600,
              color: theme.pageTextLink,
            }}
          >
            <Trans>Edit</Trans>
          </Text>
        </Button>
      )}

      <CategorySpendingHistory category={category} month={month} />
    </View>
  );
}

function countAutomations(category: CategoryEntity) {
  if (!category.goal_def) {
    return 0;
  }
  try {
    const definitions: unknown = JSON.parse(category.goal_def);
    return Array.isArray(definitions) ? definitions.length : 0;
  } catch {
    return 0;
  }
}
