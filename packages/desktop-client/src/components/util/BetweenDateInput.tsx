import type { CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { hideNativeDateIconClassName } from '#components/mobile/MobileForms';
import { DateSelect } from '#components/select/DateSelect';
import type { DateRange } from '#components/util/betweenRange';

type BetweenDateInputProps = {
  value: DateRange;
  dateFormat: string;
  onChange: (newValue: DateRange) => void;
};

/**
 * Two date pickers for the `isbetween` operator. The `num1`/`num2` keys match
 * the shape used by the number version of the operator so both render through
 * the same condition value formatting.
 */
export function BetweenDateInput({
  value,
  dateFormat,
  onChange,
}: BetweenDateInputProps) {
  const { t } = useTranslation();

  const inputProps = {
    placeholder: dateFormat.toLowerCase(),
    className: hideNativeDateIconClassName,
    style: {
      marginLeft: 0,
      marginRight: 0,
      // ios renders native date inputs taller than other fields;
      // border-box + appearance reset bring it back in line
      boxSizing: 'border-box',
      WebkitAppearance: 'none',
      appearance: 'none',
    } satisfies CSSProperties,
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 5,
      }}
    >
      <View style={{ flex: 1, minWidth: 90 }}>
        <DateSelect
          value={value.num1}
          dateFormat={dateFormat}
          openOnFocus={false}
          inputProps={{ ...inputProps, 'aria-label': t('Date range start') }}
          onSelect={num1 => onChange({ ...value, num1 })}
        />
      </View>
      <Text>
        <Trans>and</Trans>
      </Text>
      <View style={{ flex: 1, minWidth: 90 }}>
        <DateSelect
          value={value.num2}
          dateFormat={dateFormat}
          openOnFocus={false}
          inputProps={{ ...inputProps, 'aria-label': t('Date range end') }}
          onSelect={num2 => onChange({ ...value, num2 })}
        />
      </View>
    </View>
  );
}
