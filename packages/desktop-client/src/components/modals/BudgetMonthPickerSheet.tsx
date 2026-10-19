import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { SvgCalendar } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { useBudgetMonthMenu as useEnvelopeBudgetMonthMenu } from '#components/budget/envelope/budgetsummary/BudgetMonthMenu';
import { useBudgetMonthMenu as useTrackingBudgetMonthMenu } from '#components/budget/tracking/budgetsummary/BudgetMonthMenu';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetMenuRows } from '#components/mobile/MobileSheetMenuRows';
import { MobileSheetNotes } from '#components/mobile/MobileSheetNotes';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useLocale } from '#hooks/useLocale';
import { useNotes } from '#hooks/useNotes';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useUndo } from '#hooks/useUndo';
import type { Modal as ModalType } from '#modals/modalsSlice';

type BudgetMonthPickerSheetProps = Extract<
  ModalType,
  { name: 'budget-month-picker' }
>['options'];

const SHEET_NAME = 'budget-month-picker';
const MONTH_BUTTON_RADIUS = 10;
const YEAR_BUTTON_SIZE = 40;

const yearButtonStyle: CSSProperties = {
  width: YEAR_BUTTON_SIZE,
  height: YEAR_BUTTON_SIZE,
  padding: 0,
  borderRadius: radius.pill,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: theme.tooltipBorder,
  color: theme.pageTextLight,
};

export function BudgetMonthPickerSheet({
  month,
  monthBounds,
  onSelectMonth,
  onBudgetAction,
  onEditNotes,
}: BudgetMonthPickerSheetProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [year, setYear] = useState(monthUtils.getYear(month));
  const currentMonth = monthUtils.currentMonth();
  const lastSelectableMonth = monthUtils.subMonths(monthBounds.end, 1);
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const notes = useNotes(`budget-${month}`);
  const { showUndoNotification } = useUndo();

  const monthsInYear = Array.from({ length: 12 }, (_, index) =>
    monthUtils.getMonthFromIndex(year, index),
  );
  const previousYear = String(Number(year) - 1);
  const nextYear = String(Number(year) + 1);

  const isSelectable = (candidate: string) =>
    candidate >= monthBounds.start && candidate <= lastSelectableMonth;

  const hasSelectableMonths = (candidateYear: string) =>
    monthUtils.getMonthFromIndex(candidateYear, 0) <= lastSelectableMonth &&
    monthUtils.getMonthFromIndex(candidateYear, 11) >= monthBounds.start;

  const displayMonth = monthUtils.format(month, "MMMM ''yy", locale);

  const monthMenuActions = {
    onCopyLastMonthBudget: () => onBudgetAction(month, 'copy-last'),
    onSetBudgetsToZero: () => onBudgetAction(month, 'set-zero'),
    onSetMonthsAverage: (numberOfMonths: number) =>
      onBudgetAction(
        month,
        numberOfMonths === 3
          ? 'set-3-avg'
          : numberOfMonths === 6
            ? 'set-6-avg'
            : 'set-12-avg',
      ),
    onCheckTemplates: () => onBudgetAction(month, 'check-templates'),
    onApplyBudgetTemplates: () => onBudgetAction(month, 'apply-goal-template'),
    onOverwriteWithBudgetTemplates: () =>
      onBudgetAction(month, 'overwrite-goal-template'),
    onEndOfMonthCleanup: () => onBudgetAction(month, 'cleanup-goal-template'),
  };
  const envelopeMonthMenu = useEnvelopeBudgetMonthMenu(monthMenuActions);
  const trackingMonthMenu = useTrackingBudgetMonthMenu(monthMenuActions);
  const monthMenu =
    budgetType === 'tracking' ? trackingMonthMenu : envelopeMonthMenu;

  const undoMessages: Record<string, string> = {
    'copy-last': t(
      "{{displayMonth}} budgets have all been set to last month's budgeted amounts.",
      { displayMonth },
    ),
    'set-zero': t('{{displayMonth}} budgets have all been set to zero.', {
      displayMonth,
    }),
    'set-3-avg': t(
      '{{displayMonth}} budgets have all been set to {{months}} month average.',
      { displayMonth, months: 3 },
    ),
    'set-6-avg': t(
      '{{displayMonth}} budgets have all been set to {{months}} month average.',
      { displayMonth, months: 6 },
    ),
    'set-12-avg': t(
      '{{displayMonth}} budgets have all been set to yearly average.',
      { displayMonth },
    ),
    'apply-goal-template': t(
      '{{displayMonth}} budget templates have been applied.',
      { displayMonth },
    ),
    'overwrite-goal-template': t(
      '{{displayMonth}} budget templates have been overwritten.',
      { displayMonth },
    ),
    'cleanup-goal-template': t(
      '{{displayMonth}} end-of-month cleanup templates have been applied.',
      { displayMonth },
    ),
  };

  return (
    <MobileSheet name={SHEET_NAME} title={t('Select month')}>
      {({ close }) => (
        <View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.lg,
              padding: `${spacing.sm}px ${spacing.lg}px 0`,
            }}
          >
            <Button
              variant="bare"
              aria-label={t('Previous year')}
              isDisabled={!hasSelectableMonths(previousYear)}
              onPress={() => setYear(previousYear)}
              style={yearButtonStyle}
            >
              <SvgCheveronLeft width={14} height={14} />
            </Button>
            <Text
              style={{
                ...styles.tnum,
                ...styles.mediumText,
                fontWeight: 700,
                color: theme.pageTextDark,
                minWidth: 52,
                textAlign: 'center',
              }}
            >
              {year}
            </Text>
            <Button
              variant="bare"
              aria-label={t('Next year')}
              isDisabled={!hasSelectableMonths(nextYear)}
              onPress={() => setYear(nextYear)}
              style={yearButtonStyle}
            >
              <SvgCheveronRight width={14} height={14} />
            </Button>
          </View>

          <View
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: spacing.sm,
              padding: `${spacing.md}px ${spacing.lg}px ${spacing.lg}px`,
            }}
          >
            {monthsInYear.map(candidate => {
              const isSelected = candidate === month;
              const isCurrent = candidate === currentMonth;
              return (
                <Button
                  key={candidate}
                  variant="bare"
                  isDisabled={!isSelectable(candidate)}
                  aria-current={
                    isCurrent ? 'date' : isSelected ? 'true' : undefined
                  }
                  onPress={() => {
                    close();
                    onSelectMonth(candidate);
                  }}
                  data-month={candidate}
                  style={{
                    ...styles.smallText,
                    fontWeight: 600,
                    padding: `${spacing.md}px 0`,
                    borderRadius: MONTH_BUTTON_RADIUS,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor:
                      isSelected || isCurrent
                        ? theme.buttonPrimaryBackground
                        : theme.tooltipBorder,
                    backgroundColor: isSelected
                      ? theme.buttonPrimaryBackground
                      : 'transparent',
                    color: isSelected
                      ? theme.buttonPrimaryText
                      : isCurrent
                        ? theme.pageTextLink
                        : theme.pageText,
                    opacity: isSelectable(candidate) ? 1 : 0.4,
                  }}
                >
                  {monthUtils.format(candidate, 'MMM', locale)}
                </Button>
              );
            })}
          </View>

          <View style={{ padding: `0 ${spacing.lg}px ${spacing.sm}px` }}>
            <Button
              variant="bare"
              onPress={() => {
                close();
                onSelectMonth(currentMonth);
              }}
              style={{
                ...styles.smallText,
                fontWeight: 600,
                gap: spacing.sm,
                padding: spacing.md,
                borderRadius: MONTH_BUTTON_RADIUS,
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: theme.tooltipBorder,
                color: theme.pageTextLink,
              }}
            >
              <SvgCalendar width={15} height={15} />
              {t('Jump to today · {{month}}', {
                month: monthUtils.format(currentMonth, "MMMM ''yy", locale),
              })}
            </Button>
          </View>

          {notes && <MobileSheetNotes notes={notes} />}

          <MobileSheetSection title={displayMonth}>
            <MobileSheetRow
              label={t('Edit notes')}
              onPress={() => {
                close();
                onEditNotes(month);
              }}
            />
            <MobileSheetMenuRows
              items={monthMenu.items}
              onSelect={itemName => {
                close();
                monthMenu.onMenuSelect(itemName);
                const message = undoMessages[itemName];
                if (message) {
                  showUndoNotification({ message });
                }
              }}
            />
          </MobileSheetSection>
        </View>
      )}
    </MobileSheet>
  );
}
