import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronDown,
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { MonthPicker } from '@actual-app/components/month-picker';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { useGlobalPref } from '#hooks/useGlobalPref';
import { useLanguage, useLocale } from '#hooks/useLocale';

import { BudgetMonthCountSelector } from './BudgetMonthCountSelector';
import { formatBudgetMonthRange } from './formatBudgetMonthRange';
import type { MonthBounds } from './MonthsContext';
import { getScrollbarWidth } from './util';

// Height shared by the bordered controls so they line up in the row
const BUDGET_TOOLBAR_CONTROL_HEIGHT = 28;

const navigationButtonStyle = { borderRadius: 0, padding: '0 6px' };

type BudgetToolbarProps = {
  startMonth: string;
  numMonths: number;
  maxSelectableMonthCount: number;
  monthBounds: MonthBounds;
  onMonthSelect: (month: string) => void;
};

export function BudgetToolbar({
  startMonth,
  numMonths,
  maxSelectableMonthCount,
  monthBounds,
  onMonthSelect,
}: BudgetToolbarProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const locale = useLocale();
  const [, setMaxMonthsPref] = useGlobalPref('maxMonths');

  const lastDisplayedMonth = monthUtils.addMonths(startMonth, numMonths - 1);
  const lastSelectableStartMonth = monthUtils.subMonths(
    monthBounds.end,
    numMonths - 1,
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
        gap: 4,
        paddingTop: 5,
        paddingBottom: 3,
        marginLeft: 5,
        marginRight: 5 + getScrollbarWidth(),
      }}
    >
      <Button
        style={{ flexShrink: 0, height: BUDGET_TOOLBAR_CONTROL_HEIGHT }}
        onPress={() => onMonthSelect(monthUtils.currentMonth())}
      >
        <Trans>Today</Trans>
      </Button>
      <View
        style={{
          flexDirection: 'row',
          flexShrink: 0,
          height: BUDGET_TOOLBAR_CONTROL_HEIGHT,
          marginLeft: 4,
          border: `1px solid ${theme.buttonNormalBorder}`,
          borderRadius: 4,
          backgroundColor: theme.buttonNormalBackground,
          overflow: 'hidden',
        }}
      >
        <Button
          variant="bare"
          aria-label={t('Previous month')}
          style={navigationButtonStyle}
          isDisabled={startMonth <= monthBounds.start}
          onPress={() => onMonthSelect(monthUtils.prevMonth(startMonth))}
        >
          <View title={t('Previous month')}>
            <SvgCheveronLeft style={{ width: 16, height: 16 }} />
          </View>
        </Button>
        <View style={{ width: 1, backgroundColor: theme.buttonNormalBorder }} />
        <Button
          variant="bare"
          aria-label={t('Next month')}
          style={navigationButtonStyle}
          isDisabled={startMonth >= lastSelectableStartMonth}
          onPress={() => onMonthSelect(monthUtils.nextMonth(startMonth))}
        >
          <View title={t('Next month')}>
            <SvgCheveronRight style={{ width: 16, height: 16 }} />
          </View>
        </Button>
      </View>
      <MonthPicker
        value={startMonth}
        rangeEnd={lastDisplayedMonth}
        minDate={monthBounds.start}
        maxDate={monthBounds.end}
        locale={language}
        labels={{ previous: t('Previous year'), next: t('Next year') }}
        label={
          <>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {formatBudgetMonthRange(startMonth, numMonths, locale)}
            </span>
            <SvgCheveronDown
              style={{ width: 16, height: 16, flexShrink: 0, marginLeft: 4 }}
            />
          </>
        }
        triggerProps={{
          variant: 'bare',
          'data-testid': 'selected-budget-month',
          'data-month': startMonth,
        }}
        style={{ minWidth: 0, fontSize: 16, fontWeight: 600 }}
        onChange={onMonthSelect}
      />
      <View style={{ flex: 1 }} />
      <BudgetMonthCountSelector
        value={numMonths}
        maxCount={maxSelectableMonthCount}
        height={BUDGET_TOOLBAR_CONTROL_HEIGHT}
        onChange={monthCount => setMaxMonthsPref(monthCount)}
      />
    </View>
  );
}
