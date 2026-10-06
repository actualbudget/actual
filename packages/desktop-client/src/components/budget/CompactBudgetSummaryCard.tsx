import React, { useState } from 'react';
import type { ReactNode } from 'react';

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

type CompactBudgetSummaryCardProps = {
  month: string;
  currentMonth: string;
  monthMenuButton: ReactNode;
  renderPrimaryFigure: (options: { isLabelHidden: boolean }) => ReactNode;
  isExpanded: boolean;
  /** Shown under the header row while the card is expanded. */
  renderDetails: (options: { isNarrow: boolean }) => ReactNode;
};

export function CompactBudgetSummaryCard({
  month,
  currentMonth,
  monthMenuButton,
  renderPrimaryFigure,
  isExpanded,
  renderDetails,
}: CompactBudgetSummaryCardProps) {
  const locale = useLocale();
  const [cardWidth, setCardWidth] = useState<number | null>(null);
  const cardRef = useResizeObserver<HTMLDivElement>(rect => {
    setCardWidth(rect.width);
  });

  const isNarrow = cardWidth !== null && cardWidth < SHORT_MONTH_NAME_MAX_WIDTH;
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 40,
            padding: '4px 6px 4px 13px',
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: month === currentMonth ? 'bold' : 500,
              whiteSpace: 'nowrap',
            }}
          >
            {monthUtils.format(month, isNarrow ? 'MMM' : 'MMMM', locale)}
          </Text>
          {!isYearHidden && (
            <Text style={{ ...styles.tnum, color: theme.pageTextSubdued }}>
              {monthUtils.format(month, 'yyyy', locale)}
            </Text>
          )}
          <MonthStatusBadge month={month} currentMonth={currentMonth} />

          <View style={{ flex: 1 }} />

          {renderPrimaryFigure({ isLabelHidden: isNarrow })}

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
        </View>

        {isExpanded && (
          <View
            style={{
              // Lines the details up with the month name on the left and the
              // menu icon on the right (header padding + bare button padding)
              paddingTop: 6,
              paddingBottom: 8,
              paddingLeft: 13,
              paddingRight: 6 + 5,
              borderTop: '1px solid ' + theme.tableBorder,
              backgroundColor: theme.budgetHeaderCurrentMonth,
            }}
          >
            {renderDetails({ isNarrow })}
          </View>
        )}
      </SheetNameProvider>
    </View>
  );
}
