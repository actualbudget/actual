import {
  ListboxInput,
  ListboxButton,
  ListboxPopover,
  ListboxList,
  ListboxOption,
} from '@reach/listbox';
import { css } from 'glamor';

import { SvgExpandArrow } from '../../icons/v0';
import { theme, styles, type CSSProperties } from '../../style';

type SelectProps<Value extends string> = {
  bare?: boolean;
  options: Array<[Value, string]>;
  value: Value;
  defaultLabel?: string;
  onChange?: (newValue: Value) => void;
  style?: CSSProperties;
  wrapperStyle?: CSSProperties;
  line?: number;
  disabled?: boolean;
  disabledKeys?: Value[];
};

/**
 * @param {Array<[string, string]>} options - An array of options value-label pairs.
 * @param {string} value - The currently selected option value.
 * @param {string} [defaultLabel] - The label to display when the selected value is not in the options.
 * @param {function} [onChange] - A callback function invoked when the selected value changes.
 * @param {CSSProperties} [style] - Custom styles to apply to the selected button.
 * @param {CSSProperties} [wrapperStyle] - Custom style to apply to the select wrapper.
 * @param {string[]} [disabledKeys] - An array of option values to disable.
 *
 * @example
 * // Usage:
 * // <Select options={[['1', 'Option 1'], ['2', 'Option 2']]} value="1" onChange={handleOnChange} />
 * // <Select options={[['1', 'Option 1'], ['2', 'Option 2']]} value="3" defaultLabel="Select an option"  onChange={handleOnChange} />
 */

export function Select<Value extends string>({
  bare,
  options,
  value,
  defaultLabel = '',
  onChange,
  style,
  wrapperStyle,
  line,
  disabled,
  disabledKeys = [],
}: SelectProps<Value>) {
  const arrowSize = 7;
  const minHeight = style?.minHeight ? style.minHeight : '18px';
  const targetOption = options.filter(option => option[0] === value);
  return (
    <ListboxInput
      value={value}
      onChange={onChange}
      disabled={disabled}
      style={{
        color: bare ? 'inherit' : theme.formInputText,
        backgroundColor: bare ? 'transparent' : theme.cardBackground,
        borderRadius: styles.menuBorderRadius,
        border: bare ? 'none' : '1px solid ' + theme.formInputBorder,
        lineHeight: '1em',
        ...wrapperStyle,
      }}
    >
      <ListboxButton
        className={`${css([
          { borderWidth: 0, padding: 5, borderRadius: 4 },
          style,
        ])}`}
        arrow={
          <SvgExpandArrow
            style={{
              width: arrowSize,
              height: arrowSize,
              color: 'inherit',
            }}
          />
        }
      >
        <span
          style={{
            display: 'flex',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: `calc(100% - ${arrowSize + 5}px)`,
            alignItems: 'center',
            minHeight,
          }}
        >
          {targetOption.length !== 0 ? targetOption[0][1] : defaultLabel}
        </span>
      </ListboxButton>
      <ListboxPopover
        style={{
          zIndex: 100000,
          outline: 0,
          borderRadius: styles.menuBorderRadius,
          backgroundColor: theme.menuBackground,
          color: theme.menuItemText,
          boxShadow: styles.cardShadow,
          border: '1px solid ' + theme.menuBorder,
        }}
        className={`${css({
          '[data-reach-listbox-option]': {
            background: theme.menuItemBackground,
            color: theme.menuItemText,
          },
          '[data-reach-listbox-option][data-current-nav]': {
            background: theme.menuItemBackgroundHover,
            color: theme.menuItemTextHover,
          },
        })}`}
      >
        {!line ? (
          <ListboxList style={{ maxHeight: 250, overflowY: 'auto' }}>
            {options.map(([value, label]) => (
              <ListboxOption
                key={value}
                value={value}
                disabled={disabledKeys.includes(value)}
              >
                {label}
              </ListboxOption>
            ))}
          </ListboxList>
        ) : (
          <ListboxList style={{ maxHeight: 250, overflowY: 'auto' }}>
            {options.slice(0, line).map(([value, label]) => (
              <ListboxOption
                key={value}
                value={value}
                disabled={disabledKeys.includes(value)}
              >
                {label}
              </ListboxOption>
            ))}
            <div
              style={{
                padding: '2px',
                marginTop: 5,
                borderTop: '1px solid ' + theme.menuBorder,
              }}
            />
            {options.slice(line, options.length).map(([value, label]) => (
              <ListboxOption
                key={value}
                value={value}
                disabled={disabledKeys.includes(value)}
              >
                {label}
              </ListboxOption>
            ))}
          </ListboxList>
        )}
      </ListboxPopover>
    </ListboxInput>
  );
}
