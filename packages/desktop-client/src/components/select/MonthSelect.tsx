import { useRef, useState } from 'react';
import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { MonthPickerPanel } from '@actual-app/components/month-picker';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';
import {
  format as formatDate,
  isValid as isDateValid,
  parse as parseDate,
} from 'date-fns';

import { useLanguage } from '#hooks/useLocale';
import { useMergedRefs } from '#hooks/useMergedRefs';

type MonthSelectProps = {
  id?: string;
  ref?: Ref<HTMLInputElement>;
  /** The month as typed, in `monthYearFormat` (e.g. `MM/yyyy`). */
  value: string;
  monthYearFormat: string;
  onChange: (value: string) => void;
};

// A text input for a month that also offers the month picker in a popover,
// so a month can be typed or picked, like `DateSelect` does for days.
export function MonthSelect({
  id,
  ref,
  value,
  monthYearFormat,
  onChange,
}: MonthSelectProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const innerRef = useRef<HTMLInputElement | null>(null);
  const mergedRef = useMergedRefs<HTMLInputElement>(innerRef, ref);
  const [isOpen, setIsOpen] = useState(false);
  // Set while a pointer press inside the picker is moving focus into it.
  const isPickerPointerDown = useRef(false);

  function onPickerPointerDown() {
    isPickerPointerDown.current = true;
    // Clear it when the press ends, even if it didn't move focus out of the
    // input, so it can't affect a later keyboard Tab.
    const clear = () => {
      isPickerPointerDown.current = false;
      document.removeEventListener('pointerup', clear, true);
      document.removeEventListener('pointercancel', clear, true);
    };
    document.addEventListener('pointerup', clear, true);
    document.addEventListener('pointercancel', clear, true);
  }

  return (
    <View>
      <Input
        id={id}
        ref={mergedRef}
        value={value}
        placeholder={monthYearFormat.toLowerCase()}
        onChangeValue={onChange}
        onPointerUp={() => setIsOpen(true)}
        onBlur={e => {
          const isFocusInPicker =
            e.relatedTarget instanceof Element &&
            e.relatedTarget.closest('[data-month-picker]') !== null;
          const isPointer = isPickerPointerDown.current;
          isPickerPointerDown.current = false;
          if (isFocusInPicker) {
            // Clicking the picker moves focus into it: return focus to the
            // input so typing still works. Tabbing into it keeps focus there
            // so the picker can be used from the keyboard.
            if (isPointer) {
              innerRef.current?.focus();
            }
            return;
          }
          setIsOpen(false);
        }}
        onKeyDown={e => {
          // Like the date field, the picker opens on click or typing, not on
          // focus, so Escape on a freshly focused field closes the whole menu.
          if (e.key === 'Escape' || e.key === 'Enter') {
            setIsOpen(false);
          } else if (!isOpen) {
            setIsOpen(true);
          }
        }}
      />
      <Popover
        triggerRef={innerRef}
        placement="bottom start"
        offset={2}
        isOpen={isOpen}
        isNonModal
        onOpenChange={() => setIsOpen(false)}
        style={styles.popover}
      >
        <View onPointerDown={onPickerPointerDown}>
          <MonthPickerPanel
            value={toPickerMonth(value, monthYearFormat)}
            locale={language}
            labels={{ previous: t('Previous'), next: t('Next') }}
            onSelect={month => {
              setIsOpen(false);
              onChange(fromPickerMonth(month, monthYearFormat));
            }}
          />
        </View>
      </Popover>
    </View>
  );
}

// The picker works in `yyyy-MM`; the input holds the user's display format.
function toPickerMonth(value: string, monthYearFormat: string) {
  if (!value) {
    return '';
  }
  if (/^\d{4}-\d{2}$/.test(value)) {
    return value;
  }
  const date = parseDate(value, monthYearFormat, new Date());
  return isDateValid(date) ? formatDate(date, 'yyyy-MM') : '';
}

function fromPickerMonth(month: string, monthYearFormat: string) {
  const date = parseDate(month, 'yyyy-MM', new Date());
  return isDateValid(date) ? formatDate(date, monthYearFormat) : month;
}
