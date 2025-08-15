// @ts-strict-ignore
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type RefObject,
} from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import { Popover } from '@actual-app/components/popover';
import { styles, type CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';
import {
  type Locale,
  parse,
  parseISO,
  format,
  subDays,
  addDays,
  isValid,
} from 'date-fns';
import Pikaday from 'pikaday';

import {
  getDayMonthFormat,
  getDayMonthRegex,
  getShortYearFormat,
  getShortYearRegex,
  currentDate,
} from 'loot-core/shared/months';

import 'pikaday/css/pikaday.css';

import DateSelectLeft from './DateSelect.left.png';
import DateSelectRight from './DateSelect.right.png';

import { InputField } from '@desktop-client/components/mobile/MobileForms';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useMergedRefs } from '@desktop-client/hooks/useMergedRefs';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

const pickerStyles: CSSProperties = {
  '& .pika-single.actual-date-picker': {
    color: theme.calendarText,
    background: theme.calendarBackground,
    border: 'none',
    boxShadow: '0 0px 4px rgba(0, 0, 0, .25)',
    borderRadius: 4,
  },

  '& .actual-date-picker': {
    '& .pika-lendar': {
      float: 'none',
      width: 'auto',
    },
    // month/year
    '& .pika-label': {
      backgroundColor: theme.calendarBackground,
    },
    // Back/forward buttons
    '& .pika-prev': {
      backgroundImage: `url(${DateSelectLeft})`,
    },
    '& .pika-next': {
      backgroundImage: `url(${DateSelectRight})`,
    },
    // Day of week
    '& .pika-table th': {
      color: theme.calendarItemText,
      '& abbr': { textDecoration: 'none' },
    },
    // Numbered days
    '& .pika-button': {
      backgroundColor: theme.calendarItemBackground,
      color: theme.calendarItemText,
    },
    '& .is-today .pika-button': {
      textDecoration: 'underline',
    },
    '& .is-selected .pika-button': {
      backgroundColor: theme.calendarSelectedBackground,
      boxShadow: 'none',
    },
  },
};

type PikadayI18n = {
  previousMonth: string;
  nextMonth: string;
  months: string[];
  weekdays: string[];
  weekdaysShort: string[];
};

function createPikadayLocale(dateFnsLocale: Locale): PikadayI18n {
  const months = Array.from({ length: 12 }, (_, i) =>
    format(new Date(2023, i, 1), 'MMMM', { locale: dateFnsLocale }),
  );

  const weekdays = Array.from({ length: 7 }, (_, i) =>
    format(new Date(2023, 0, i + 1), 'EEEE', { locale: dateFnsLocale }),
  );

  const weekdaysShort = Array.from({ length: 7 }, (_, i) =>
    format(new Date(2023, 0, i + 1), 'EEE', { locale: dateFnsLocale }).slice(
      0,
      3,
    ),
  );

  return {
    previousMonth: 'Previous',
    nextMonth: 'Next',
    months,
    weekdays,
    weekdaysShort,
  };
}

type DatePickerProps = {
  value: string;
  firstDayOfWeekIdx: string;
  dateFormat: string;
  onUpdate?: (selectedDate: Date) => void;
  onSelect: (selectedDate: Date | null) => void;
};

type DatePickerForwardedRef = {
  handleInputKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
};
const DatePicker = forwardRef<DatePickerForwardedRef, DatePickerProps>(
  ({ value, firstDayOfWeekIdx, dateFormat, onUpdate, onSelect }, ref) => {
    const locale = useLocale();
    const picker = useRef(null);
    const mountPoint = useRef(null);

    useImperativeHandle(
      ref,
      () => ({
        handleInputKeyDown(e) {
          let newDate = null;
          switch (e.key) {
            case 'ArrowLeft':
              e.preventDefault();
              newDate = subDays(picker.current.getDate(), 1);
              break;
            case 'ArrowUp':
              e.preventDefault();
              newDate = subDays(picker.current.getDate(), 7);
              break;
            case 'ArrowRight':
              e.preventDefault();
              newDate = addDays(picker.current.getDate(), 1);
              break;
            case 'ArrowDown':
              e.preventDefault();
              newDate = addDays(picker.current.getDate(), 7);
              break;
            default:
          }

          if (newDate) {
            picker.current.setDate(newDate, true);
            onUpdate?.(newDate);
          }
        },
      }),
      [],
    );

    useLayoutEffect(() => {
      const pikadayLocale = createPikadayLocale(locale);

      picker.current = new Pikaday({
        theme: 'actual-date-picker',
        keyboardInput: false,
        firstDay: parseInt(firstDayOfWeekIdx),
        defaultDate: value
          ? parse(value, dateFormat, currentDate())
          : currentDate(),
        setDefaultDate: true,
        toString(date) {
          return format(date, dateFormat);
        },
        parse(dateString) {
          return parse(dateString, dateFormat, new Date());
        },
        onSelect,
        i18n: pikadayLocale,
      });

      mountPoint.current.appendChild(picker.current.el);

      return () => {
        picker.current.destroy();
      };
    }, []);

    useEffect(() => {
      if (value && picker.current.getDate() !== value) {
        picker.current.setDate(parse(value, dateFormat, new Date()), true);
      }
    }, [value, dateFormat]);

    return (
      <View
        className={css([pickerStyles, { flex: 1 }])}
        innerRef={mountPoint}
      />
    );
  },
);

DatePicker.displayName = 'DatePicker';

function defaultShouldSaveFromKey(e) {
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
  inputRef?: RefObject<HTMLInputElement>;
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
  inputRef: originalInputRef,
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

  const picker = useRef(null);
  const [value, setValue] = useState(parsedDefaultValue);
  const [open, setOpen] = useState(embedded || isOpen || false);
  const inputRef = useRef(null);

  // useLayoutEffect(() => {
  //   if (originalInputRef) {
  //     originalInputRef.current = inputRef.current;
  //   }
  // }, []);

  const mergedInputRefs = useMergedRefs(originalInputRef, inputRef);

  // This is confusing, so let me explain: `selectedValue` should be
  // renamed to `currentValue`. It represents the current highlighted
  // value in the date select and always changes as the user moves
  // around. `userSelectedValue` represents the last value that the
  // user actually selected (with enter or click). Having both allows
  // us to make various UX decisions
  const [selectedValue, setSelectedValue] = useState(value);
  const userSelectedValue = useRef(selectedValue);

  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  useEffect(() => {
    userSelectedValue.current = value;
  }, [value]);

  useEffect(() => setValue(parsedDefaultValue), [parsedDefaultValue]);

  useEffect(() => {
    if (getDayMonthRegex(dateFormat).test(value)) {
      // Support only entering the month and day (4/5). This is complex
      // because of the various date formats - we need to derive
      // the right day/month format from it
      const test = parse(value, getDayMonthFormat(dateFormat), new Date());
      if (isValid(test)) {
        onUpdate?.(format(test, 'yyyy-MM-dd'));
        setSelectedValue(format(test, dateFormat));
      }
    } else if (getShortYearRegex(dateFormat).test(value)) {
      // Support entering the year as only two digits (4/5/19)
      const test = parse(value, getShortYearFormat(dateFormat), new Date());
      if (isValid(test)) {
        onUpdate?.(format(test, 'yyyy-MM-dd'));
        setSelectedValue(format(test, dateFormat));
      }
    } else {
      const test = parse(value, dateFormat, new Date());
      if (isValid(test)) {
        const date = format(test, 'yyyy-MM-dd');
        onUpdate?.(date);
        setSelectedValue(value);
      }
    }
  }, [value]);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) &&
      !e.shiftKey &&
      !e.metaKey &&
      !e.altKey &&
      open
    ) {
      picker.current.handleInputKeyDown(e);
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
      if (inputRef.current) {
        inputRef.current.setSelectionRange(0, 10000);
      }
    }
  }

  function onChange(e) {
    setValue(e.target.value);
  }

  const maybeWrapTooltip = content => {
    if (embedded) {
      return open ? content : null;
    }

    return (
      <Popover
        triggerRef={inputRef}
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
        ref={mergedInputRefs}
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
            // If value is empty, that drives what gets selected.
            // Otherwise the input is reset to whatever is already
            // selected
            if (value === '') {
              setSelectedValue(null);
              onSelect(null);
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
          firstDayOfWeekIdx={firstDayOfWeekIdx}
          dateFormat={dateFormat}
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
  return (
    <InputField
      id={props.id}
      type="date"
      value={props.value ?? ''}
      onChange={event => {
        props.onSelect(event.target.value);
      }}
      style={{ height: 28 }}
      {...props.inputProps}
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
