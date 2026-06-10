import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgTime } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { useDateFormat } from '#hooks/useDateFormat';

import { DateSelect } from './DateSelect';

type DateTimeParts = {
  date: string;
  time: string;
};

type DateTimeSelectProps = {
  value: string;
  onChangeValue: (value: string) => void;
  defaultTime?: string;
  isRequired?: boolean;
};

function getDateTimeParts(value: string, defaultTime: string): DateTimeParts {
  const trimmed = value.trim();
  if (!trimmed) {
    return { date: '', time: '' };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { date: trimmed, time: defaultTime };
  }

  const normalized = trimmed.replace(' ', 'T');
  return {
    date: normalized.slice(0, 10),
    time: normalized.slice(11, 16) || defaultTime,
  };
}

function buildDateTime(
  date: string,
  time: string,
  defaultTime: string,
): string {
  if (!date) {
    return '';
  }

  const selectedTime = time || defaultTime;
  if (/^\d{2}:\d{2}:\d{2}$/.test(selectedTime)) {
    return `${date}T${selectedTime}`;
  }

  return `${date}T${selectedTime}:00`;
}

function getTimeParts(time: string) {
  const [hour = '00', minute = '00'] = time.split(':');
  return {
    hour: Number(hour),
    minute: Number(minute),
  };
}

function formatTimeValue(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parseTimeInput(input: string, is24Hour: boolean, currentHour: number) {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2})(?::(\d{1,2}))?\s*([ap]m?)?$/i);

  if (!match) {
    return null;
  }

  const [, hourText, minuteText = '00', periodText] = match;
  const minute = Number(minuteText);
  if (minute < 0 || minute > 59) {
    return null;
  }

  const period = periodText?.toUpperCase().startsWith('P') ? 'PM' : 'AM';
  if (periodText || !is24Hour) {
    const hour12 = Number(hourText);
    if (hour12 < 1 || hour12 > 12) {
      return null;
    }

    const selectedPeriod = periodText
      ? period
      : currentHour >= 12
        ? 'PM'
        : 'AM';
    const hour =
      selectedPeriod === 'PM'
        ? hour12 === 12
          ? 12
          : hour12 + 12
        : hour12 === 12
          ? 0
          : hour12;

    return { hour, minute };
  }

  const hour = Number(hourText);
  if (hour < 0 || hour > 23) {
    return null;
  }

  return { hour, minute };
}

function uses24HourTime() {
  const parts = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
  }).formatToParts(new Date(2020, 0, 1, 13));

  return !parts.some(part => part.type === 'dayPeriod');
}

function formatDisplayTime(time: string, is24Hour: boolean) {
  const { hour, minute } = getTimeParts(time);
  if (is24Hour) {
    return formatTimeValue(hour, minute);
  }

  const displayHour = hour % 12 || 12;
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

const timeColumnClassName = css({
  scrollbarWidth: 'thin',
  scrollbarColor: `${theme.formInputBorderSelected} ${theme.menuBackground}`,

  '&::-webkit-scrollbar': {
    width: 8,
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: theme.menuBackground,
    borderRadius: 999,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.formInputBorderSelected,
    border: `2px solid ${theme.menuBackground}`,
    borderRadius: 999,
  },
  '&::-webkit-scrollbar-thumb:hover': {
    backgroundColor: theme.formInputBackgroundSelection,
  },
});

const selectedTimeButtonClassName = css({
  color: `${theme.buttonPrimaryText} !important`,
  backgroundColor: `${theme.formInputBackgroundSelection} !important`,

  '&[data-hovered]': {
    color: `${theme.buttonPrimaryText} !important`,
    backgroundColor: `${theme.formInputBackgroundSelection} !important`,
  },
  '&[data-pressed]': {
    backgroundColor: `${theme.formInputBackgroundSelection} !important`,
  },
});

type TimeColumnProps = {
  values: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
};

function TimeColumn({ values, selectedValue, onSelect }: TimeColumnProps) {
  const shouldScroll = values.length > 12;

  return (
    <View
      className={timeColumnClassName}
      style={{
        maxHeight: shouldScroll ? 220 : undefined,
        overflowY: shouldScroll ? 'auto' : 'visible',
      }}
    >
      {values.map(value => {
        const selected = value === selectedValue;
        return (
          <Button
            key={value}
            variant="bare"
            onPress={() => onSelect(value)}
            className={selected ? selectedTimeButtonClassName : undefined}
            style={{
              width: 52,
              justifyContent: 'center',
              padding: '6px 8px',
              color: selected ? theme.buttonPrimaryText : theme.pageText,
              backgroundColor: selected
                ? theme.formInputBackgroundSelection
                : 'transparent',
              fontWeight: selected ? 700 : 400,
              borderRadius: 2,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value}
          </Button>
        );
      })}
    </View>
  );
}

type TimeSelectProps = {
  value: string;
  onChangeValue: (value: string) => void;
};

function TimeSelect({ value, onChangeValue }: TimeSelectProps) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const is24Hour = useMemo(() => uses24HourTime(), []);
  const { hour, minute } = getTimeParts(value);
  const [displayValue, setDisplayValue] = useState(() =>
    formatDisplayTime(value, is24Hour),
  );
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;

  useEffect(() => {
    setDisplayValue(formatDisplayTime(value, is24Hour));
  }, [is24Hour, value]);

  const hours = is24Hour
    ? Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
    : Array.from({ length: 12 }, (_, index) =>
        String(index + 1).padStart(2, '0'),
      );
  const minutes = ['00', '15', '30', '45'];

  const updateTime = ({
    nextHour = hour,
    nextMinute = minute,
  }: {
    nextHour?: number;
    nextMinute?: number;
  }) => {
    const nextTime = formatTimeValue(nextHour, nextMinute);
    onChangeValue(nextTime);
    setDisplayValue(formatDisplayTime(nextTime, is24Hour));
  };

  const updateTimeFromInput = (nextValue: string) => {
    setDisplayValue(nextValue);
  };

  const commitTimeInput = (nextValue: string) => {
    const parsed = parseTimeInput(nextValue, is24Hour, hour);
    if (parsed) {
      const nextTime = formatTimeValue(parsed.hour, parsed.minute);
      onChangeValue(nextTime);
      setDisplayValue(formatDisplayTime(nextTime, is24Hour));
    } else {
      resetDisplayValue();
    }
  };

  const closePopover = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      commitTimeInput(displayValue);
    }
  };

  const resetDisplayValue = () => {
    setDisplayValue(formatDisplayTime(value, is24Hour));
  };

  const updateHour12 = (selectedHour: number, selectedPeriod = period) => {
    const nextHour =
      selectedPeriod === 'PM'
        ? selectedHour === 12
          ? 12
          : selectedHour + 12
        : selectedHour === 12
          ? 0
          : selectedHour;
    updateTime({ nextHour });
  };

  return (
    <View
      ref={triggerRef}
      style={{
        width: is24Hour ? 86 : 108,
        height: 28,
        justifyContent: 'center',
      }}
    >
      <Input
        value={displayValue}
        onChangeValue={updateTimeFromInput}
        onUpdate={commitTimeInput}
        onEnter={commitTimeInput}
        style={{
          width: is24Hour ? 86 : 108,
          height: 28,
          padding: '4px 24px 4px 7px',
          color: theme.formInputText,
          backgroundColor: theme.formInputBackground,
          borderColor: isOpen
            ? theme.formInputBorderSelected
            : theme.formInputBorder,
          boxShadow: isOpen
            ? `0 1px 1px ${theme.formInputShadowSelected}`
            : undefined,
          fontVariantNumeric: 'tabular-nums',
        }}
      />
      <Button
        variant="bare"
        onPress={() => setIsOpen(true)}
        aria-label={t('Choose time')}
        style={{
          position: 'absolute',
          top: 1,
          right: 1,
          width: 24,
          height: 26,
          padding: 0,
          backgroundColor: 'transparent',
          borderRadius: 4,
        }}
      >
        <SvgTime
          style={{
            width: 13,
            height: 13,
            color: theme.formInputTextPlaceholder,
            flexShrink: 0,
          }}
        />
      </Button>
      <Popover
        triggerRef={triggerRef}
        isOpen={isOpen}
        placement="bottom start"
        onOpenChange={closePopover}
        style={{
          padding: 4,
          backgroundColor: theme.menuBackground,
          border: `1px solid ${theme.menuBorder}`,
          boxShadow: `0 4px 8px ${theme.menuBorder}`,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <TimeColumn
            values={hours}
            selectedValue={String(is24Hour ? hour : hour12).padStart(2, '0')}
            onSelect={selectedHour => {
              if (is24Hour) {
                updateTime({ nextHour: Number(selectedHour) });
              } else {
                updateHour12(Number(selectedHour));
              }
            }}
          />
          <TimeColumn
            values={minutes}
            selectedValue={String(minute).padStart(2, '0')}
            onSelect={selectedMinute => {
              updateTime({ nextMinute: Number(selectedMinute) });
            }}
          />
          {!is24Hour && (
            <TimeColumn
              values={['AM', 'PM']}
              selectedValue={period}
              onSelect={selectedPeriod => {
                updateHour12(hour12, selectedPeriod);
              }}
            />
          )}
        </View>
      </Popover>
    </View>
  );
}

export function DateTimeSelect({
  value,
  onChangeValue,
  defaultTime = '00:00',
  isRequired = false,
}: DateTimeSelectProps) {
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const { date, time } = getDateTimeParts(value, defaultTime);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <DateSelect
        value={date}
        dateFormat={dateFormat}
        clearOnBlur={isRequired}
        onSelect={selectedDate => {
          onChangeValue(buildDateTime(selectedDate, time, defaultTime));
        }}
        inputProps={{ style: { width: 128 } }}
        containerProps={{ style: { width: 128 } }}
      />
      <TimeSelect
        value={time}
        onChangeValue={selectedTime => {
          onChangeValue(buildDateTime(date, selectedTime, defaultTime));
        }}
      />
    </View>
  );
}
