import React, {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import { useSelector } from 'react-redux';

import * as d from 'date-fns';
import Pikaday from 'pikaday';

import 'pikaday/css/pikaday.css';

import {
  getDayMonthFormat,
  getDayMonthRegex,
  getShortYearFormat,
  getShortYearRegex,
  currentDate,
} from 'loot-core/src/shared/months';
import { stringToInteger } from 'loot-core/src/shared/util';

import { theme } from '../../style';
import Input from '../common/Input';
import View from '../common/View';
import { Tooltip } from '../tooltips';

import DateSelectLeft from './DateSelect.left.png';
import DateSelectRight from './DateSelect.right.png';

let pickerStyles = {
  '& .pika-single.actual-date-picker': {
    color: theme.sidebarItemTextHover,
    background: theme.sidebarBackground,
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
      backgroundColor: theme.sidebarBackground,
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
      color: theme.sidebarItemText,
      '& abbr': { textDecoration: 'none' },
    },
    // Numbered days
    '& .pika-button': {
      backgroundColor: theme.sidebarItemBackgroundHover,
      color: theme.sidebarItemText,
    },
    '& .is-today .pika-button': {
      textDecoration: 'underline',
    },
    '& .is-selected .pika-button': {
      backgroundColor: theme.altButtonNormalSelectedBackground,
      boxShadow: 'none',
    },
  },
};

let DatePicker = forwardRef(
  ({ value, firstDayOfWeekIdx, dateFormat, onUpdate, onSelect }, ref) => {
    let picker = useRef(null);
    let mountPoint = useRef(null);

    useImperativeHandle(
      ref,
      () => ({
        handleInputKeyDown(e) {
          let newDate = null;
          switch (e.key) {
            case 'ArrowLeft':
              e.preventDefault();
              newDate = d.subDays(picker.current.getDate(), 1);
              break;
            case 'ArrowUp':
              e.preventDefault();
              newDate = d.subDays(picker.current.getDate(), 7);
              break;
            case 'ArrowRight':
              e.preventDefault();
              newDate = d.addDays(picker.current.getDate(), 1);
              break;
            case 'ArrowDown':
              e.preventDefault();
              newDate = d.addDays(picker.current.getDate(), 7);
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
      picker.current = new Pikaday({
        theme: 'actual-date-picker',
        keyboardInput: false,
        firstDay: stringToInteger(firstDayOfWeekIdx),
        defaultDate: value
          ? d.parse(value, dateFormat, currentDate())
          : currentDate(),
        setDefaultDate: true,
        toString(date) {
          return d.format(date, dateFormat);
        },
        parse(dateString) {
          return d.parse(dateString, dateFormat, new Date());
        },
        onSelect,
      });

      mountPoint.current.appendChild(picker.current.el);

      return () => {
        picker.current.destroy();
      };
    }, []);

    useEffect(() => {
      if (picker.current.getDate() !== value) {
        picker.current.setDate(d.parse(value, dateFormat, new Date()), true);
      }
    }, [value, dateFormat]);

    return <View style={{ ...pickerStyles, flex: 1 }} innerRef={mountPoint} />;
  },
);

function defaultShouldSaveFromKey(e) {
  return e.key === 'Enter';
}

export default function DateSelect({
  containerProps,
  inputProps,
  tooltipStyle,
  value: defaultValue,
  isOpen,
  embedded,
  dateFormat = 'yyyy-MM-dd',
  focused,
  openOnFocus = true,
  inputRef: originalInputRef,
  shouldSaveFromKey = defaultShouldSaveFromKey,
  tableBehavior,
  onUpdate,
  onSelect,
}) {
  let parsedDefaultValue = useMemo(() => {
    if (defaultValue) {
      let date = d.parseISO(defaultValue);
      if (d.isValid(date)) {
        return d.format(date, dateFormat);
      }
    }
    return '';
  }, [defaultValue, dateFormat]);

  let picker = useRef(null);
  let [value, setValue] = useState(parsedDefaultValue);
  let [open, setOpen] = useState(embedded || isOpen || false);
  let inputRef = useRef(null);

  useLayoutEffect(() => {
    if (originalInputRef) {
      originalInputRef.current = inputRef.current;
    }
  }, []);

  // This is confusing, so let me explain: `selectedValue` should be
  // renamed to `currentValue`. It represents the current highlighted
  // value in the date select and always changes as the user moves
  // around. `userSelectedValue` represents the last value that the
  // user actually selected (with enter or click). Having both allows
  // us to make various UX decisions
  let [selectedValue, setSelectedValue] = useState(value);
  let userSelectedValue = useRef(selectedValue);

  const firstDayOfWeekIdx = useSelector(state =>
    state.prefs.local?.firstDayOfWeekIdx
      ? state.prefs.local.firstDayOfWeekIdx
      : '0',
  );

  useEffect(() => {
    userSelectedValue.current = value;
  }, [value]);

  useEffect(() => setValue(parsedDefaultValue), [parsedDefaultValue]);

  useEffect(() => {
    if (getDayMonthRegex(dateFormat).test(value)) {
      // Support only entering the month and day (4/5). This is complex
      // because of the various date formats - we need to derive
      // the right day/month format from it
      let test = d.parse(value, getDayMonthFormat(dateFormat), new Date());
      if (d.isValid(test)) {
        onUpdate?.(d.format(test, 'yyyy-MM-dd'));
        setSelectedValue(d.format(test, dateFormat));
      }
    } else if (getShortYearRegex(dateFormat).test(value)) {
      // Support entering the year as only two digits (4/5/19)
      let test = d.parse(value, getShortYearFormat(dateFormat), new Date());
      if (d.isValid(test)) {
        onUpdate?.(d.format(test, 'yyyy-MM-dd'));
        setSelectedValue(d.format(test, dateFormat));
      }
    } else {
      let test = d.parse(value, dateFormat, new Date());
      if (d.isValid(test)) {
        let date = d.format(test, 'yyyy-MM-dd');
        onUpdate?.(date);
        setSelectedValue(value);
      }
    }
  }, [value]);

  function onKeyDown(e) {
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
      setValue(selectedValue);
      setOpen(false);

      let date = d.parse(selectedValue, dateFormat, new Date());
      onSelect(d.format(date, 'yyyy-MM-dd'));

      if (open && e.key === 'Enter') {
        // This stops the event from propagating up
        e.stopPropagation();
        e.preventDefault();
      }

      let { onKeyDown } = inputProps || {};
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

  let maybeWrapTooltip = content => {
    return embedded ? (
      content
    ) : (
      <Tooltip
        position="bottom-left"
        offset={2}
        style={{ padding: 0, minWidth: 225, ...tooltipStyle }}
        data-testid="date-select-tooltip"
      >
        {content}
      </Tooltip>
    );
  };

  return (
    <View {...containerProps}>
      <Input
        focused={focused}
        {...inputProps}
        inputRef={inputRef}
        value={value}
        onPointerUp={e => {
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

          if (!tableBehavior) {
            // If value is empty, that drives what gets selected.
            // Otherwise the input is reset to whatever is already
            // selected
            if (value === '') {
              setSelectedValue(null);
              onSelect(null);
            } else {
              setValue(selectedValue || '');

              let date = d.parse(selectedValue, dateFormat, new Date());
              if (date instanceof Date && !isNaN(date)) {
                onSelect(d.format(date, 'yyyy-MM-dd'));
              }
            }
          }
        }}
      />
      {open &&
        maybeWrapTooltip(
          <DatePicker
            ref={picker}
            value={selectedValue}
            firstDayOfWeekIdx={firstDayOfWeekIdx}
            dateFormat={dateFormat}
            onUpdate={date => {
              setSelectedValue(d.format(date, dateFormat));
              onUpdate?.(d.format(date, 'yyyy-MM-dd'));
            }}
            onSelect={date => {
              setValue(d.format(date, dateFormat));
              onSelect(d.format(date, 'yyyy-MM-dd'));
              setOpen(false);
            }}
          />,
        )}
    </View>
  );
}
