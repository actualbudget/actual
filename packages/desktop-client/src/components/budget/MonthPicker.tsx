// @ts-strict-ignore
import type { CSSProperties } from 'react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { Link } from '#components/common/Link';
import { useLocale } from '#hooks/useLocale';
import { useResizeObserver } from '#hooks/useResizeObserver';

import type { MonthBounds } from './MonthsContext';

type MonthPickerProps = {
  startMonth: string;
  numDisplayed: number;
  monthBounds: MonthBounds;
  style: CSSProperties;
  onSelect: (month: string) => void;
};

const arrowButtonStyle: CSSProperties = {
  padding: 4,
  borderRadius: 6,
  color: theme.pageTextLight,
};

/**
 * A strip of months used to pick which month(s) the budget shows. Months
 * without any budget data are struck through so it is clear where the data
 * starts and ends.
 */
export const MonthPicker = ({
  startMonth,
  numDisplayed,
  monthBounds,
  style,
  onSelect,
}: MonthPickerProps) => {
  const locale = useLocale();
  const { t } = useTranslation();
  const [hoverId, setHoverId] = useState(null);
  const [targetMonthCount, setTargetMonthCount] = useState(12);

  const currentMonth = monthUtils.currentMonth();
  const firstSelectedMonth = startMonth;

  const lastSelectedMonth = monthUtils.addMonths(
    firstSelectedMonth,
    numDisplayed - 1,
  );

  const range = monthUtils.rangeInclusive(
    monthUtils.subMonths(
      firstSelectedMonth,
      Math.floor(targetMonthCount / 2 - numDisplayed / 2),
    ),
    monthUtils.addMonths(
      lastSelectedMonth,
      Math.floor(targetMonthCount / 2 - numDisplayed / 2),
    ),
  );

  const firstSelectedIndex =
    Math.floor(range.length / 2) - Math.floor(numDisplayed / 2);
  const lastSelectedIndex = firstSelectedIndex + numDisplayed - 1;

  const [size, setSize] = useState('small');
  const containerRef = useResizeObserver(
    rect => {
      setSize(rect.width <= 420 ? 'small' : 'big');
      setTargetMonthCount(
        Math.min(Math.max(Math.floor((rect.width - 120) / 44), 6), 24),
      );
    },
    { measureOnAttach: true },
  );

  const yearHeadersShown = [];

  return (
    <View
      data-testid="month-picker"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...style,
      }}
    >
      <View
        innerRef={containerRef}
        style={{
          flexDirection: 'row',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          // Leave room for the year labels drawn above the months.
          paddingTop: 14,
        }}
      >
        <Link
          variant="button"
          buttonVariant="bare"
          aria-label={t('Previous month')}
          onPress={() => onSelect(monthUtils.prevMonth(startMonth))}
          style={{ ...arrowButtonStyle, marginRight: 6 }}
        >
          <View title={t('Previous month')}>
            <SvgCheveronLeft style={{ width: 16, height: 16 }} />
          </View>
        </Link>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            padding: 2,
            borderRadius: 8,
            backgroundColor: theme.pillBackgroundLight,
            border: `1px solid ${theme.tableBorder}`,
          }}
        >
          {range.map((month, idx) => {
            const monthName = monthUtils.format(month, 'MMM', locale);
            const selected =
              idx >= firstSelectedIndex && idx <= lastSelectedIndex;

            const lastHoverId = hoverId + numDisplayed - 1;
            const hovered =
              hoverId === null ? false : idx >= hoverId && idx <= lastHoverId;

            const current = currentMonth === month;
            const year = monthUtils.getYear(month);

            let showYearHeader = false;

            if (!yearHeadersShown.includes(year)) {
              yearHeadersShown.push(year);
              showYearHeader = true;
            }

            const isMonthBudgeted =
              month >= monthBounds.start && month <= monthBounds.end;

            return (
              <View
                key={month}
                data-testid={selected ? 'selected-budget-month' : undefined}
                data-month={selected ? month : undefined}
                aria-current={current ? 'date' : undefined}
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 0',
                  height: 26,
                  width: size === 'big' ? 40 : 24,
                  textAlign: 'center',
                  userSelect: 'none',
                  cursor: 'pointer',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: current ? 700 : 500,
                  color: isMonthBudgeted
                    ? theme.pageText
                    : theme.pageTextSubdued,
                  transition: 'background-color .1s',
                  ...(!isMonthBudgeted && {
                    textDecoration: 'line-through',
                  }),
                  ...(selected && {
                    backgroundColor: theme.buttonPrimaryBackground,
                    color: theme.buttonPrimaryText,
                    borderRadius: 0,
                  }),
                  ...(hoverId !== null &&
                    !hovered &&
                    selected && {
                      filter: 'brightness(85%)',
                    }),
                  ...(hovered &&
                    !selected && {
                      backgroundColor: theme.buttonBareBackgroundHover,
                      borderRadius: 0,
                    }),
                  ...(!hovered &&
                    !selected &&
                    current && {
                      boxShadow: `inset 0 0 0 1px ${theme.buttonPrimaryBackground}`,
                      color: theme.pageTextPositive,
                    }),
                  ...(hovered &&
                    selected && {
                      backgroundColor: theme.buttonPrimaryBackgroundHover,
                    }),
                  ...((idx === firstSelectedIndex ||
                    (idx === hoverId && !selected)) && {
                    borderTopLeftRadius: 6,
                    borderBottomLeftRadius: 6,
                  }),
                  ...((idx === lastSelectedIndex ||
                    (idx === lastHoverId && !selected)) && {
                    borderTopRightRadius: 6,
                    borderBottomRightRadius: 6,
                  }),
                }}
                onClick={() => onSelect(month)}
                onMouseEnter={() => setHoverId(idx)}
                onMouseLeave={() => setHoverId(null)}
              >
                <View>
                  {size === 'small' ? monthName[0] : monthName}
                  {showYearHeader && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -20,
                        left: 0,
                        ...styles.tinyText,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        color: isMonthBudgeted
                          ? theme.pageTextLight
                          : theme.pageTextSubdued,
                      }}
                    >
                      {year}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
        <Link
          variant="button"
          buttonVariant="bare"
          aria-label={t('Next month')}
          onPress={() => onSelect(monthUtils.nextMonth(startMonth))}
          style={{ ...arrowButtonStyle, marginLeft: 6 }}
        >
          <View title={t('Next month')}>
            <SvgCheveronRight style={{ width: 16, height: 16 }} />
          </View>
        </Link>
      </View>
    </View>
  );
};
