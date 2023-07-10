import {
  ListboxInput,
  ListboxButton,
  ListboxPopover,
  ListboxList,
  ListboxOption,
} from '@reach/listbox';
import { type CSSProperties, css } from 'glamor';

import ExpandArrow from '../../icons/v0/ExpandArrow';

type CustomSelectProps = {
  options: Array<[string, string]>;
  value: string;
  defaultLabel?: string;
  onChange?: (newValue: string) => void;
  style?: CSSProperties;
  wrapperStyle?: CSSProperties;
  disabledKeys?: string[];
};

export default function CustomSelect({
  options,
  value,
  defaultLabel = '',
  onChange,
  style,
  wrapperStyle,
  disabledKeys = [],
}: CustomSelectProps) {
  const arrowSize = 7;
  const targetOption = options.filter(option => option[0] === value);
  return (
    <ListboxInput
      value={value}
      onChange={onChange}
      style={{ lineHeight: '1em', ...wrapperStyle }}
    >
      <ListboxButton
        {...css([
          { borderWidth: 0, padding: '2px 5px', borderRadius: 4 },
          style,
        ])}
        arrow={<ExpandArrow style={{ width: arrowSize, height: arrowSize }} />}
      >
        <span
          style={{
            display: 'flex',
            overflowX: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: `calc(100% - ${arrowSize + 5}px)`,
            minHeight: '18px',
            alignItems: 'center',
          }}
        >
          {targetOption.length !== 0 ? targetOption[0][1] : defaultLabel}
        </span>
      </ListboxButton>
      <ListboxPopover style={{ zIndex: 10000, outline: 0, borderRadius: 4 }}>
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
      </ListboxPopover>
    </ListboxInput>
  );
}
