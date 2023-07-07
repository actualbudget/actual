import {
  ListboxInput,
  ListboxButton,
  ListboxPopover,
  ListboxList,
  ListboxOption,
} from '@reach/listbox';
import { type CSSProperties, css } from 'glamor';

import ExpandArrow from '../../icons/v0/ExpandArrow';
import { colorsm } from '../../style';

type CustomSelectProps = {
  options: Array<[string, string]>;
  value: string;
  onChange?: (newValue: string) => void;
  style?: CSSProperties;
  disabledKeys?: string[];
};

export default function CustomSelect({
  options,
  value,
  onChange,
  style,
  disabledKeys = [],
}: CustomSelectProps) {
  return (
    <ListboxInput
      value={value}
      onChange={onChange}
      style={{ lineHeight: '1em' }}
    >
      <ListboxButton
        {...css([{ borderWidth: 0, padding: 5, borderRadius: 4 }, style])}
        arrow={
          <ExpandArrow
            style={{
              width: 7,
              height: 7,
              paddingTop: 3,
              color: colorsm.formInputText,
            }}
          />
        }
      />
      <ListboxPopover
        style={{
          zIndex: 10000,
          outline: 0,
          borderRadius: 4,
          backgroundColor: colorsm.menuBackground,
          border: '1px solid ' + colorsm.menuBorder,
        }}
      >
        <ListboxList style={{ maxHeight: 250, overflowY: 'scroll' }}>
          {options.map(([value, label]) => (
            <ListboxOption
              key={value}
              value={value}
              disabled={disabledKeys.includes(value)}
              {...css({
                background: colorsm.menuItemBackground,
                color: colorsm.menuItemText,
                ':hover': {
                  background: colorsm.menuItemBackgroundHover,
                  color: colorsm.menuItemTextHover,
                },
                ':active': {
                  background: colorsm.menuItemBackgroundHover,
                  color: colorsm.menuItemTextHover,
                },
              })}
            >
              {label}
            </ListboxOption>
          ))}
        </ListboxList>
      </ListboxPopover>
    </ListboxInput>
  );
}
