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

export type MultiSelectOption<Value = string> =
  | [Value, string]
  | typeof Menu.line;

type MultiSelectProps<Value> = {
  id?: string;
  bare?: boolean;
  options: Array<readonly [Value, string] | typeof Menu.line>;
  value: Value[];
  defaultLabel?: string;
  onChange?: (newValue: Value[]) => void;
  disabled?: boolean;
  disabledKeys?: Value[];
  style?: CSSProperties;
  popoverStyle?: CSSProperties;
  className?: string;
};

/**
 * @param {Array<[string, string]>} options - An array of options value-label pairs.
 * @param {string[]} value - The currently selected option values.
 * @param {string} [defaultLabel] - The label to display when no values are selected.
 * @param {function} [onChange] - A callback function invoked when the selected values change.
 * @param {CSSProperties} [style] - Custom styles to apply to the selected button.
 * @param {string[]} [disabledKeys] - An array of option values to disable.
 *
 * @example
 * // Usage:
 * // <MultiSelect options={[['1', 'Option 1'], ['2', 'Option 2']]} value={['1']} onChange={handleOnChange} />
 * // <MultiSelect options={[['1', 'Option 1'], ['2', 'Option 2']]} value={[]} defaultLabel="Select options"  onChange={handleOnChange} />
 */
export function MultiSelect<const Value = string>({
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
}: MultiSelectProps<Value>) {
  const triggerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  // Create a map for quick lookup of labels by value
  const optionMap = new Map(
    options.filter(isValueOption).map(opt => [opt[0], opt[1]]),
  );

  // Build display text in the order of selection (value array order)
  const displayText =
    value.length > 0
      ? value
          .map(v => optionMap.get(v))
          .filter(label => label != null)
          .join(', ')
      : defaultLabel;

  const handleItemSelect = (item: Value) => {
    const newValue = value.includes(item)
      ? value.filter(v => v !== item)
      : [...value, item];
    onChange?.(newValue);
    // Keep the popover open for multiple selections
  };

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
            {displayText}
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
        onOpenChange={setIsOpen}
        style={popoverStyle}
      >
        <Menu
          onMenuSelect={handleItemSelect}
          items={options.map(item =>
            item === Menu.line
              ? Menu.line
              : {
                  name: item[0],
                  text: item[1],
                  disabled: disabledKeys.includes(item[0]),
                },
          )}
          getItemStyle={option =>
            value.includes(option.name) ? { fontWeight: 'bold' } : {}
          }
        />
      </Popover>
    </>
  );
}
