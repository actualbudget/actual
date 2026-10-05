import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgArrowButtonDown1 } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { NotesButton } from '#components/NotesButton';
import { useLocale } from '#hooks/useLocale';
import { useResizeObserver } from '#hooks/useResizeObserver';
import { SheetNameProvider } from '#hooks/useSheetName';

import { MonthStatusBadge } from './MonthStatusBadge';

// Below these widths the card drops details so the figure always fits
const SHORT_MONTH_NAME_MAX_WIDTH = 380;
const HIDDEN_YEAR_MAX_WIDTH = 290;

type CollapsedBudgetSummaryCardProps = {
  month: string;
  currentMonth: string;
  monthMenuButton: ReactNode;
  renderPrimaryFigure: (options: { isLabelHidden: boolean }) => ReactNode;
  onToggleSummaryCollapse: () => void;
};

export function CollapsedBudgetSummaryCard({
  month,
  currentMonth,
  monthMenuButton,
  renderPrimaryFigure,
  onToggleSummaryCollapse,
}: CollapsedBudgetSummaryCardProps) {
  const locale = useLocale();
  const { t } = useTranslation();
  const [cardWidth, setCardWidth] = useState<number | null>(null);
  const cardRef = useResizeObserver<HTMLDivElement>(rect => {
    setCardWidth(rect.width);
  });

  const isMonthNameShortened =
    cardWidth !== null && cardWidth < SHORT_MONTH_NAME_MAX_WIDTH;
  const isYearHidden = cardWidth !== null && cardWidth < HIDDEN_YEAR_MAX_WIDTH;

  return (
    <View
      innerRef={cardRef}
      data-testid="budget-summary"
      data-month={month}
      style={{
        backgroundColor:
          month === currentMonth
            ? theme.budgetCurrentMonth
            : theme.budgetOtherMonth,
        boxShadow: styles.cardShadow,
        borderRadius: 6,
        marginTop: 5,
        marginBottom: 5,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 40,
        padding: '4px 6px 4px 10px',
        cursor: 'default',
        overflow: 'hidden',
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .25s',
        },
        '&:hover .hover-visible': {
          opacity: 1,
        },
      }}
    >
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
        {/* Sits on the left to match the collapse button of the expanded card */}
        <Button
          variant="bare"
          aria-label={t('Expand month summary')}
          className="hover-visible"
          onPress={onToggleSummaryCollapse}
        >
          <SvgArrowButtonDown1
            width={13}
            height={13}
            // The margin is to make it the exact same size as the dots button
            style={{ color: theme.pageTextLight, margin: 1 }}
          />
        </Button>
        <Text
          style={{
            fontSize: 15,
            fontWeight: month === currentMonth ? 'bold' : 500,
            whiteSpace: 'nowrap',
          }}
        >
          {monthUtils.format(
            month,
            isMonthNameShortened ? 'MMM' : 'MMMM',
            locale,
          )}
        </Text>
        {!isYearHidden && (
          <Text style={{ ...styles.tnum, color: theme.pageTextSubdued }}>
            {monthUtils.format(month, 'yyyy', locale)}
          </Text>
        )}
        <MonthStatusBadge month={month} currentMonth={currentMonth} />

        <View style={{ flex: 1 }} />

        {renderPrimaryFigure({ isLabelHidden: isMonthNameShortened })}

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <NotesButton
            id={`budget-${month}`}
            width={15}
            height={15}
            tooltipPosition="bottom right"
            defaultColor={theme.pageTextLight}
          />
          <View style={{ userSelect: 'none' }}>{monthMenuButton}</View>
        </View>
      </SheetNameProvider>
    </View>
  );
}
