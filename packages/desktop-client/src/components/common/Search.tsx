import { type ChangeEvent, type Ref } from 'react';

import { SvgRemove, SvgSearchAlternate } from '../../icons/v2';
import { type CSSProperties, theme } from '../../style';

import { Button } from './Button';
import { InputWithContent } from './InputWithContent';

type SearchProps = {
  inputRef?: Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => unknown;
  placeholder: string;
  isInModal?: boolean;
  style?: CSSProperties;
};

const DEFAULT_WIDTH = 250;

export function Search({
  inputRef,
  value,
  onChange,
  placeholder,
  isInModal = false,
  style,
}: SearchProps) {
  return (
    <InputWithContent
      inputRef={inputRef}
      style={{
        width: style?.width || DEFAULT_WIDTH,
        flex: '',
        borderColor: isInModal ? null : 'transparent',
        backgroundColor: isInModal ? null : theme.formInputBackground,
        ...style,
      }}
      focusStyle={
        isInModal
          ? null
          : {
              boxShadow: '0 0 0 1px ' + theme.formInputShadowSelected,
              backgroundColor: theme.formInputBackgroundSelected,
            }
      }
      leftContent={
        <SvgSearchAlternate
          style={{
            width: 13,
            height: 13,
            flexShrink: 0,
            color: value ? theme.menuItemTextSelected : 'inherit',
            margin: 5,
            marginRight: 0,
          }}
        />
      }
      rightContent={
        value && (
          <Button
            type="bare"
            style={{ padding: 8 }}
            onClick={() => onChange('')}
            title="Clear search term"
          >
            <SvgRemove style={{ width: 8, height: 8 }} />
          </Button>
        )
      }
      inputStyle={{
        '::placeholder': {
          color: theme.formInputTextPlaceholder,
          transition: 'color .25s',
        },
        ':focus': isInModal
          ? null
          : {
              '::placeholder': {
                color: theme.formInputTextPlaceholderSelected,
              },
            },
      }}
      value={value}
      placeholder={placeholder}
      onKeyDown={e => {
        if (e.key === 'Escape') onChange('');
      }}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
    />
  );
}
