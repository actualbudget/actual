import { useRef, useState, type CSSProperties } from 'react';

import { Button } from './Button';
import { SvgExpandArrow } from './icons/v0';
import { Menu } from './Menu';
import { Popover } from './Popover';
import { View } from './View';

function isValueOption<Value>(
  option: readonly [Value, string] | typeof Menu.line,
): option is [Value, string] {
  return option !== Menu.line;
}

export type SelectOption<Value = string> = [Value, string] | typeof Menu.line;

type SelectProps<Value> = {
  id?: string;
  bare?: boolean;
  options: Array<readonly [Value, string] | typeof Menu.line>;
  value: Value;
  defaultLabel?: string;
  onChange?: (newValue: Value) => void;
  disabled?: boolean;
  disabledKeys?: Value[];
  style?: CSSProperties;
  popoverStyle?: CSSProperties;
  className?: string;
};

/**
 * @param {Array<[string, string]>} options - An array of options value-label pairs.
 * @param {string} value - The currently selected option value.
 * @param {string} [defaultLabel] - The label to display when the selected value is not in the options.
 * @param {function} [onChange] - A callback function invoked when the selected value changes.
 * @param {CSSProperties} [style] - Custom styles to apply to the selected button.
 * @param {string[]} [disabledKeys] - An array of option values to disable.
 *
 * @example
 * // Usage:
 * // <Select options={[['1', 'Option 1'], ['2', 'Option 2']]} value="1" onChange={handleOnChange} />
 * // <Select options={[['1', 'Option 1'], ['2', 'Option 2']]} value="3" defaultLabel="Select an option"  onChange={handleOnChange} />
 */
export function Select<const Value = string>({
  id,
  bare,
  options,
  value,
  defaultLabel = '',
  onChange,
  disabled = false,
  disabledKeys = [],
  style = {},
  popoverStyle = {},
  className,
}: SelectProps<Value>) {
  const targetOption = options
    .filter(isValueOption)
    .find(option => option[0] === value);

  const triggerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        ref={triggerRef}
        id={id}
        variant={bare ? 'bare' : 'normal'}
        isDisabled={disabled}
        onPress={() => {
          setIsOpen(true);
        }}
        style={style}
        className={className}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 5,
            width: '100%',
          }}
        >
          <span
            style={{
              textAlign: 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: 'calc(100% - 7px)',
            }}
          >
            {targetOption ? targetOption[1] : defaultLabel}
          </span>
          <SvgExpandArrow
            style={{
              width: 7,
              height: 7,
              color: 'inherit',
            }}
          />
        </View>
      </Button>

      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
        style={popoverStyle}
      >
        <Menu
          onMenuSelect={item => {
            onChange?.(item);
            setIsOpen(false);
          }}
          items={options.map(item =>
            item === Menu.line
              ? Menu.line
              : {
                  name: item[0],
                  text: item[1],
                  disabled: disabledKeys.includes(item[0]),
                },
          )}
          getItemStyle={option => {
            if (targetOption && targetOption[0] === option.name) {
              return { fontWeight: 'bold' };
            }
            return {};
          }}
        />
      </Popover>
    </>
  );
}
