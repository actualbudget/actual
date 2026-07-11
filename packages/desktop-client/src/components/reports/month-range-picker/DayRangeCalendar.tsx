import {
  Button as AriaButton,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarMonthPicker,
  I18nProvider,
  RangeCalendar,
} from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import {
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';
import { css } from '@emotion/css';
import { parseDate } from '@internationalized/date';

import { FIRST_DAY_OF_WEEK_NAMES } from '#components/select/DateSelect';
import { useLanguage } from '#hooks/useLocale';

import { YearSelect } from './YearSelect';

const calendarStyles: CSSProperties = {
  '& .calendar-header': {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: 10,
    '& button': {
      color: 'inherit',
      background: 'none',
      border: 'none',
      borderRadius: 4,
      padding: 5,
      cursor: 'pointer',
      display: 'flex',
      '&:hover': { backgroundColor: theme.calendarItemBackground },
      '&[disabled]': { opacity: 0.4, cursor: 'default' },
    },
    '& select': {
      color: 'inherit',
      background: 'none',
      border: 'none',
      borderRadius: 4,
      padding: 4,
      fontWeight: 'bold',
      fontSize: 13,
      cursor: 'pointer',
      '&:hover': { backgroundColor: theme.calendarItemBackground },
    },
  },
  '& .react-aria-CalendarGrid': {
    borderCollapse: 'collapse',
  },
  '& .react-aria-CalendarHeaderCell': {
    color: theme.pageTextSubdued,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: '2px 0',
  },
  '& .react-aria-CalendarCell': {
    width: 28,
    height: 28,
    lineHeight: '28px',
    textAlign: 'center',
    fontSize: 12,
    cursor: 'pointer',
    '&[data-outside-month]': {
      display: 'none',
    },
    '&[data-hovered]': {
      backgroundColor: theme.calendarItemBackground,
      borderRadius: 4,
    },
    // Same current-day treatment as the month grid's GridButton.
    '&[data-today]': {
      fontWeight: 'bold',
      boxShadow: `inset 0 0 0 1px ${theme.pageTextLink}`,
      borderRadius: 4,
      color: theme.pageTextLink,
    },
    '&[data-selected]': {
      backgroundColor: theme.pillBackgroundSelected,
      borderRadius: 0,
      color: theme.calendarText,
    },
    '&[data-selection-start], &[data-selection-end]': {
      backgroundColor: theme.buttonPrimaryBackground,
      color: theme.buttonPrimaryText,
    },
    '&[data-selection-start]': {
      borderRadius: '4px 0 0 4px',
    },
    '&[data-selection-end]': {
      borderRadius: '0 4px 4px 0',
    },
    '&[data-disabled]': {
      opacity: 0.4,
      cursor: 'default',
    },
    '&[data-focus-visible]': {
      outline: `2px solid ${theme.buttonPrimaryBackground}`,
      outlineOffset: -2,
    },
  },
};

type DayRangeCalendarProps = {
  /** Inclusive day-shaped (`yyyy-MM-dd`) range and bounds. */
  start: string;
  end: string;
  min: string;
  max: string;
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'];
  onChange: (start: string, end: string) => void;
};

/** Day-granularity range calendar with month/year dropdowns in the header. */
export function DayRangeCalendar({
  start,
  end,
  min,
  max,
  firstDayOfWeekIdx,
  onChange,
}: DayRangeCalendarProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const firstDayOfWeek =
    FIRST_DAY_OF_WEEK_NAMES[parseInt(firstDayOfWeekIdx || '0', 10) || 0];

  return (
    <View className={css(calendarStyles)}>
      <I18nProvider locale={language}>
        <RangeCalendar
          aria-label={t('Date range')}
          value={{ start: parseDate(start), end: parseDate(end) }}
          minValue={parseDate(min)}
          maxValue={parseDate(max)}
          firstDayOfWeek={firstDayOfWeek}
          onChange={range =>
            onChange(range.start.toString(), range.end.toString())
          }
        >
          <View className="calendar-header">
            <AriaButton slot="previous" aria-label={t('Previous month')}>
              <SvgCheveronLeft width={16} height={16} />
            </AriaButton>
            <CalendarMonthPicker format="long">
              {({ 'aria-label': ariaLabel, value, onChange, items }) => (
                <select
                  aria-label={ariaLabel}
                  value={value as number}
                  onChange={e => onChange(Number(e.target.value))}
                >
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.formatted}
                    </option>
                  ))}
                </select>
              )}
            </CalendarMonthPicker>
            <YearSelect min={min} max={max} />
            <AriaButton slot="next" aria-label={t('Next month')}>
              <SvgCheveronRight width={16} height={16} />
            </AriaButton>
          </View>
          <CalendarGrid weekdayStyle="narrow">
            <CalendarGridHeader>
              {day => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
            </CalendarGridHeader>
            <CalendarGridBody>
              {date => <CalendarCell date={date} />}
            </CalendarGridBody>
          </CalendarGrid>
        </RangeCalendar>
      </I18nProvider>
    </View>
  );
}
