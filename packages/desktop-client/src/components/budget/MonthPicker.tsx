// @ts-strict-ignore
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import {
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { SvgCalendar } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { Link } from '#components/common/Link';
import { useFocusedViews } from '#hooks/useFocusedViews';
import { useLocale } from '#hooks/useLocale';
import { useResizeObserver } from '#hooks/useResizeObserver';

import type { MonthBounds } from './MonthsContext';

type MonthPickerProps = {
  startMonth: string;
  numDisplayed: number;
  monthBounds: MonthBounds;
  style: CSSProperties;
  onSelect: (month: string) => void;
  /** Called with the x-offset (in px) from the MonthPicker root's left edge to the first month label. */
  onFirstMonthXOffset?: (offset: number) => void;
  /** Called with the layout measurements for the filter views bar (from calendar to collapse icon). */
  onMonthPickerLayout?: (layout: {
    calendarOffset: number;
    width: number;
  }) => void;
};

export const MonthPicker = ({
  startMonth,
  numDisplayed,
  monthBounds,
  style,
  onSelect,
  onFirstMonthXOffset,
  onMonthPickerLayout,
}: MonthPickerProps) => {
  const locale = useLocale();
  const { t } = useTranslation();
  const [hoverId, setHoverId] = useState(null);
  const [targetMonthCount, setTargetMonthCount] = useState(12);


  // Measure the real pixel offset from the MonthPicker root to the first month
  // label and report it to the parent so the views bar can align precisely.
  const pickerRootEl = useRef<Element | null>(null);
  const firstMonthEl = useRef<Element | null>(null);
  const containerEl = useRef<Element | null>(null);
  const calendarIconEl = useRef<Element | null>(null);
  const collapseIconEl = useRef<Element | null>(null);

  // Use a ref so the layout effect closure is always fresh without being a dep.
  const onFirstMonthXOffsetRef = useRef(onFirstMonthXOffset);
  onFirstMonthXOffsetRef.current = onFirstMonthXOffset;

  const onMonthPickerLayoutRef = useRef(onMonthPickerLayout);
  onMonthPickerLayoutRef.current = onMonthPickerLayout;
  const lastFirstMonthXOffset = useRef<number | null>(null);
  const lastMonthPickerLayout = useRef<{
    calendarOffset: number;
    width: number;
  } | null>(null);

  const pickerRootRef = useCallback((el: Element | null) => {
    pickerRootEl.current = el;
  }, []);

  const firstMonthRefCallback = useCallback((el: Element | null) => {
    firstMonthEl.current = el;
  }, []);

  const calendarIconRefCallback = useCallback((el: Element | null) => {
    calendarIconEl.current = el;
  }, []);

  const collapseIconRefCallback = useCallback((el: Element | null) => {
    collapseIconEl.current = el;
  }, []);

  // Fire after every render (no deps) so any resize/reflow that triggers a
  // React re-render also triggers a fresh measurement.
  useLayoutEffect(() => {
    if (pickerRootEl.current && firstMonthEl.current) {
      const rootLeft = pickerRootEl.current.getBoundingClientRect().left;
      const firstLeft = firstMonthEl.current.getBoundingClientRect().left;
      const offset = firstLeft - rootLeft;

      if (lastFirstMonthXOffset.current !== offset) {
        lastFirstMonthXOffset.current = offset;
        onFirstMonthXOffsetRef.current?.(offset);
      }
    }

    if (
      onMonthPickerLayoutRef.current &&
      containerEl.current &&
      calendarIconEl.current &&
      collapseIconEl.current
    ) {
      const containerRect = containerEl.current.getBoundingClientRect();
      const calendarRect = calendarIconEl.current.getBoundingClientRect();
      const collapseRect = collapseIconEl.current.getBoundingClientRect();
      const layout = {
        calendarOffset: calendarRect.left - containerRect.left,
        width: collapseRect.right - containerRect.left,
      };
      const lastLayout = lastMonthPickerLayout.current;

      if (
        !lastLayout ||
        lastLayout.calendarOffset !== layout.calendarOffset ||
        lastLayout.width !== layout.width
      ) {
        lastMonthPickerLayout.current = layout;
        onMonthPickerLayoutRef.current(layout);
      }
    }
  });

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
  const containerRef = useResizeObserver(rect => {
    setSize(rect.width <= 400 ? 'small' : 'big');
    setTargetMonthCount(
      Math.min(Math.max(Math.floor(rect.width / 50), 12), 24),
    );
  });

  const yearHeadersShown = [];

  return (
    <View
      innerRef={pickerRootRef}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...style,
      }}
    >
      <View
        innerRef={el => {
          containerRef(el);
          containerEl.current = el;
        }}
        style={{
          flexDirection: 'row',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View innerRef={calendarIconRefCallback}>
          <Link
            variant="button"
            buttonVariant="bare"
            onPress={() => onSelect(currentMonth)}
            style={{
              padding: '3px 3px',
              marginRight: '12px',
            }}
          >
            <View title={t('Today')}>
              <SvgCalendar
                style={{
                  width: 16,
                  height: 16,
                }}
              />
            </View>
          </Link>
        </View>
        <Link
          variant="button"
          buttonVariant="bare"
          onPress={() => onSelect(monthUtils.prevMonth(startMonth))}
          style={{
            padding: '3px 3px',
            marginRight: '12px',
          }}
        >
          <View title={t('Previous month')}>
            <SvgCheveronLeft
              style={{
                width: 16,
                height: 16,
              }}
            />
          </View>
        </Link>
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
              innerRef={el => {
                if (idx === 0) firstMonthRefCallback(el);
              }}
              data-testid={selected ? 'selected-budget-month' : undefined}
              data-month={selected ? month : undefined}
              style={{
                alignItems: 'center',
                padding: '3px 3px',
                width: size === 'big' ? '35px' : '20px',
                textAlign: 'center',
                userSelect: 'none',
                cursor: 'default',
                borderRadius: 2,
                border: 'none',
                ...(!isMonthBudgeted && {
                  textDecoration: 'line-through',
                  color: theme.pageTextSubdued,
                }),
                ...styles.smallText,
                ...(selected && {
                  backgroundColor: theme.buttonPrimaryBackground,
                  color: theme.buttonPrimaryText,
                }),
                ...((hovered || selected) && {
                  borderRadius: 0,
                  cursor: 'pointer',
                }),
                ...(hoverId !== null &&
                  !hovered &&
                  selected && {
                    filter: 'brightness(65%)',
                  }),
                ...(hovered &&
                  !selected && {
                    backgroundColor: theme.buttonBareBackgroundHover,
                  }),
                ...(!hovered &&
                  !selected &&
                  current && {
                    backgroundColor: theme.buttonBareBackgroundHover,
                    filter: 'brightness(120%)',
                  }),
                ...(hovered &&
                  selected &&
                  current && {
                    filter: 'brightness(120%)',
                  }),
                ...(hovered &&
                  selected && {
                    backgroundColor: theme.buttonPrimaryBackground,
                  }),
                ...((idx === firstSelectedIndex ||
                  (idx === hoverId && !selected)) && {
                  borderTopLeftRadius: 2,
                  borderBottomLeftRadius: 2,
                }),
                ...((idx === lastSelectedIndex ||
                  (idx === lastHoverId && !selected)) && {
                  borderTopRightRadius: 2,
                  borderBottomRightRadius: 2,
                }),
                ...(current && { fontWeight: 'bold' }),
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
                      top: -16,
                      left: 0,
                      fontSize: 10,
                      fontWeight: 'bold',
                      color: isMonthBudgeted
                        ? theme.pageText
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
        <Link
          variant="button"
          buttonVariant="bare"
          onPress={() => onSelect(monthUtils.nextMonth(startMonth))}
          style={{
            padding: '3px 3px',
            marginLeft: '12px',
          }}
        >
          <View title={t('Next month')}>
            <SvgCheveronRight
              style={{
                width: 16,
                height: 16,
              }}
            />
          </View>
        </Link>
      </View>
    </View>
  );
};
