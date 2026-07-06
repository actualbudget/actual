import {
  forwardRef,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ChangeEvent,
  ComponentProps,
  JSX,
  KeyboardEvent,
  Ref,
} from 'react';
import {
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
  I18nProvider,
} from 'react-aria-components';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import {
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  currentDate,
  getDayMonthFormat,
  getDayMonthRegex,
  getShortYearFormat,
  getShortYearRegex,
} from '@actual-app/core/shared/months';
import { css } from '@emotion/css';
import { CalendarDate } from '@internationalized/date';
import { addDays, format, isValid, parse, parseISO, subDays } from 'date-fns';

import { InputField } from '#components/mobile/MobileForms';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useMergedRefs } from '#hooks/useMergedRefs';
import { useSyncedPref } from '#hooks/useSyncedPref';

const FIRST_DAY_OF_WEEK_NAMES = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
] as const;

// Encode the user's configured first day of week into the locale via the
// Unicode "fw" extension, which @internationalized/date honors -
// react-aria-components' CalendarGrid has no direct prop for it.
function withFirstDayOfWeek(locale: string, firstDayOfWeekIdx: string): string {
  const day = FIRST_DAY_OF_WEEK_NAMES[parseInt(firstDayOfWeekIdx, 10) || 0];
  return `${locale}-u-fw-${day}`;
}

function toCalendarDate(date: Date): CalendarDate {
  return new CalendarDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}

function fromCalendarDate(date: CalendarDate): Date {
  return new Date(date.year, date.month - 1, date.day);
}

const pickerStyles: CSSProperties = {
  '& .react-aria-Calendar': {
    color: theme.calendarText,
    background: theme.calendarBackground,
    boxShadow: '0 0px 4px rgba(0, 0, 0, .25)',
    borderRadius: 4,
    padding: 10,
  },
  '& .calendar-header': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  '& .calendar-header-title': {
    fontWeight: 'bold',
    backgroundColor: theme.calendarBackground,
  },
  '& .react-aria-CalendarGrid': {
    borderCollapse: 'collapse',
  },
  '& .react-aria-CalendarHeaderCell': {
    color: theme.calendarItemText,
    fontWeight: 'normal',
    textAlign: 'center',
    padding: '2px 0',
  },
  '& .react-aria-CalendarCell': {
    width: 28,
    height: 28,
    lineHeight: '28px',
    textAlign: 'center',
    borderRadius: 4,
    cursor: 'pointer',
    backgroundColor: theme.calendarItemBackground,
    color: theme.calendarItemText,

    '&[data-outside-month]': {
      opacity: 0.4,
    },
    '&[data-today]': {
      textDecoration: 'underline',
    },
    '&[data-selected]': {
      backgroundColor: theme.calendarSelectedBackground,
    },
    '&[data-disabled]': {
      opacity: 0.4,
      cursor: 'default',
    },
    '&[data-focus-visible]': {
      outline: `2px solid ${theme.calendarSelectedBackground}`,
    },
  },
};

type DatePickerProps = {
  value: string;
  dateFormat: string;
  locale: string;
  onUpdate: (selectedDate: Date) => void;
  onSelect: (selectedDate: Date) => void;
};

type DatePickerForwardedRef = {
  handleInputKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
};
const DatePicker = forwardRef<DatePickerForwardedRef, DatePickerProps>(
  ({ value, dateFormat, locale, onUpdate, onSelect }, ref) => {
    const parsedValue = value ? parse(value, dateFormat, currentDate()) : null;
    const focusedCalendarDate = toCalendarDate(
      parsedValue && isValid(parsedValue) ? parsedValue : currentDate(),
    );

    const onUpdateEffect = useEffectEvent(onUpdate);

    useImperativeHandle(
      ref,
      () => ({
        handleInputKeyDown(e) {
          const jsDate = fromCalendarDate(focusedCalendarDate);

          let newDate = null;
          switch (e.key) {
            case 'ArrowLeft':
              e.preventDefault();
              newDate = subDays(jsDate, 1);
              break;
            case 'ArrowUp':
              e.preventDefault();
              newDate = subDays(jsDate, 7);
              break;
            case 'ArrowRight':
              e.preventDefault();
              newDate = addDays(jsDate, 1);
              break;
            case 'ArrowDown':
              e.preventDefault();
              newDate = addDays(jsDate, 7);
              break;
            default:
          }

          if (newDate) {
            onUpdateEffect(newDate);
          }
        },
      }),
      [focusedCalendarDate],
    );

    return (
      <View className={css([pickerStyles, { flex: 1 }])}>
        <I18nProvider locale={locale}>
          <Calendar
            value={focusedCalendarDate}
            onChange={date => onSelect(fromCalendarDate(date))}
          >
            <View className="calendar-header">
              <Button variant="bare" slot="previous">
                <SvgCheveronLeft width={16} height={16} />
              </Button>
              <Heading className="calendar-header-title" />
              <Button variant="bare" slot="next">
                <SvgCheveronRight width={16} height={16} />
              </Button>
            </View>
            <CalendarGrid>
              <CalendarGridHeader>
                {day => (
                  <CalendarHeaderCell>{day.slice(0, 2)}</CalendarHeaderCell>
                )}
              </CalendarGridHeader>
              <CalendarGridBody>
                {date => <CalendarCell date={date} />}
              </CalendarGridBody>
            </CalendarGrid>
          </Calendar>
        </I18nProvider>
      </View>
    );
  },
);

DatePicker.displayName = 'DatePicker';

function defaultShouldSaveFromKey(e: KeyboardEvent<HTMLInputElement>) {
  return e.key === 'Enter';
}

type DateSelectProps = {
  id?: string;
  containerProps?: ComponentProps<typeof View>;
  inputProps?: ComponentProps<typeof Input>;
  value: string;
  isOpen?: boolean;
  embedded?: boolean;
  dateFormat: string;
  openOnFocus?: boolean;
  ref?: Ref<HTMLInputElement>;
  shouldSaveFromKey?: (e: KeyboardEvent<HTMLInputElement>) => boolean;
  clearOnBlur?: boolean;
  onUpdate?: (selectedDate: string) => void;
  onSelect: (selectedDate: string) => void;
};

function DateSelectDesktop({
  id,
  containerProps,
  inputProps,
  value: defaultValue,
  isOpen,
  embedded,
  dateFormat = 'yyyy-MM-dd',
  openOnFocus = true,
  ref,
  shouldSaveFromKey = defaultShouldSaveFromKey,
  clearOnBlur = true,
  onUpdate,
  onSelect,
}: DateSelectProps) {
  const parsedDefaultValue = useMemo(() => {
    if (defaultValue) {
      const date = parseISO(defaultValue);
      if (isValid(date)) {
        return format(date, dateFormat);
      }
    }
    return '';
  }, [defaultValue, dateFormat]);

  const picker = useRef<DatePickerForwardedRef | null>(null);
  const [value, setValue] = useState(parsedDefaultValue);
  const [open, setOpen] = useState(embedded || isOpen || false);
  const innerRef = useRef<HTMLInputElement | null>(null);
  const mergedRef = useMergedRefs<HTMLInputElement>(innerRef, ref);

  const [selectedValue, setSelectedValue] = useState(value);

  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  const [language] = useGlobalPref('language');
  const locale = withFirstDayOfWeek(
    language || navigator.language || 'en-US',
    firstDayOfWeekIdx,
  );

  useEffect(() => setValue(parsedDefaultValue), [parsedDefaultValue]);

  const onUpdateEffect = useEffectEvent((newValue: string) => {
    if (getDayMonthRegex(dateFormat).test(newValue)) {
      // Support only entering the month and day (4/5). This is complex
      // because of the various date formats - we need to derive
      // the right day/month format from it
      const test = parse(newValue, getDayMonthFormat(dateFormat), new Date());
      if (isValid(test)) {
        onUpdate?.(format(test, 'yyyy-MM-dd'));
        setSelectedValue(format(test, dateFormat));
      }
    } else if (getShortYearRegex(dateFormat).test(newValue)) {
      // Support entering the year as only two digits (4/5/19)
      const test = parse(newValue, getShortYearFormat(dateFormat), new Date());
      if (isValid(test)) {
        onUpdate?.(format(test, 'yyyy-MM-dd'));
        setSelectedValue(format(test, dateFormat));
      }
    } else {
      const test = parse(newValue, dateFormat, new Date());
      if (isValid(test)) {
        const date = format(test, 'yyyy-MM-dd');
        onUpdate?.(date);
        setSelectedValue(newValue);
      }
    }
  });

  useEffect(() => {
    onUpdateEffect(value);
  }, [value]);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) &&
      !e.shiftKey &&
      !e.metaKey &&
      !e.altKey &&
      open
    ) {
      picker.current?.handleInputKeyDown(e);
    } else if (e.key === 'Escape') {
      setValue(parsedDefaultValue);
      setSelectedValue(parsedDefaultValue);

      if (parsedDefaultValue === value) {
        if (open) {
          if (!embedded) {
            e.stopPropagation();
          }

          setOpen(false);
        }
      } else {
        setOpen(true);
        onUpdate?.(defaultValue);
      }
    } else if (shouldSaveFromKey(e)) {
      if (selectedValue) {
        setValue(selectedValue);
        const date = parse(selectedValue, dateFormat, new Date());
        onSelect(format(date, 'yyyy-MM-dd'));
      }

      setOpen(false);

      if (open && e.key === 'Enter') {
        // This stops the event from propagating up
        e.stopPropagation();
        e.preventDefault();
      }

      const { onKeyDown } = inputProps || {};
      onKeyDown?.(e);
    } else if (!open) {
      setOpen(true);
      if (innerRef.current) {
        innerRef.current.setSelectionRange(0, 10000);
      }
    }
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
  }

  const maybeWrapTooltip = (content: JSX.Element) => {
    if (embedded) {
      return open ? content : null;
    }

    return (
      <Popover
        triggerRef={innerRef}
        placement="bottom start"
        offset={2}
        isOpen={open}
        isNonModal
        onOpenChange={() => setOpen(false)}
        style={{ ...styles.popover, minWidth: 225 }}
        data-testid="date-select-tooltip"
      >
        {content}
      </Popover>
    );
  };

  return (
    <View {...containerProps}>
      <Input
        id={id}
        {...inputProps}
        ref={mergedRef}
        value={value}
        onPointerUp={() => {
          if (!embedded) {
            setOpen(true);
          }
        }}
        onKeyDown={onKeyDown}
        onChange={onChange}
        onFocus={e => {
          if (!embedded && openOnFocus) {
            setOpen(true);
          }
          inputProps?.onFocus?.(e);
        }}
        onBlur={e => {
          if (!embedded) {
            setOpen(false);
          }
          inputProps?.onBlur?.(e);

          if (clearOnBlur) {
            // If value is empty, reset to previously selected value
            // instead of saving an empty date (which the server rejects).
            if (value === '') {
              if (selectedValue) {
                setValue(selectedValue);
                const date = parse(selectedValue, dateFormat, new Date());
                if (date instanceof Date && !isNaN(date.valueOf())) {
                  onSelect(format(date, 'yyyy-MM-dd'));
                }
              }
            } else {
              setValue(selectedValue || '');

              const date = parse(selectedValue, dateFormat, new Date());
              if (date instanceof Date && !isNaN(date.valueOf())) {
                onSelect(format(date, 'yyyy-MM-dd'));
              }
            }
          }
        }}
      />
      {maybeWrapTooltip(
        <DatePicker
          ref={picker}
          value={selectedValue}
          dateFormat={dateFormat}
          locale={locale}
          onUpdate={date => {
            setSelectedValue(format(date, dateFormat));
            onUpdate?.(format(date, 'yyyy-MM-dd'));
          }}
          onSelect={date => {
            setValue(format(date, dateFormat));
            onSelect(format(date, 'yyyy-MM-dd'));
            setOpen(false);
          }}
        />,
      )}
    </View>
  );
}

function DateSelectMobile(props: DateSelectProps) {
  const { style: inputStyle, ...restInputProps } = props.inputProps ?? {};
  return (
    <InputField
      id={props.id}
      type="date"
      value={props.value ?? ''}
      onChange={event => {
        props.onSelect(event.target.value);
      }}
      style={{ height: 28, ...inputStyle }}
      {...restInputProps}
    />
  );
}

export function DateSelect(props: DateSelectProps) {
  const { isNarrowWidth } = useResponsive();

  if (isNarrowWidth) {
    return <DateSelectMobile {...props} />;
  }

  return <DateSelectDesktop {...props} />;
}
