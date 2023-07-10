import {
  ListboxInput,
  ListboxButton,
  ListboxPopover,
  ListboxList,
  ListboxOption,
} from '@reach/listbox';
import { type CSSProperties, css } from 'glamor';

import ExpandArrow from '../../icons/v0/ExpandArrow';
import { colors } from '../../style';

type CustomSelectProps = {
  options: Array<[string, string]>;
  value: string;
  onChange?: (newValue: string) => void;
  style?: CSSProperties;
  wrapperStyle?: CSSProperties;
  line: number;
  disabledKeys?: string[];
};

export default function CustomSelect({
  options,
  value,
  onChange,
  style,
  wrapperStyle,
  line,
  disabledKeys = [],
}: CustomSelectProps) {
  const arrowSize = 7;
  const label = options.filter(option => option[0] === value)[0][1];
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
          {label}
        </span>
      </ListboxButton>
      <ListboxPopover style={{ zIndex: 10000, outline: 0, borderRadius: 4 }}>
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
                borderTop: '1px solid ' + colors.n10,
              }}
            ></div>
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
