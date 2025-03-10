import { useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { defaultInputStyle, Input } from '@actual-app/components/input';
import { type CSSProperties } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';

import { SvgRemove, SvgSearchAlternate } from '@actual-app/components/icons/v2';
import { theme } from '@actual-app/components/theme';

type SearchProps = {
  inputRef?: Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isInModal?: boolean;
  width?: number | '100%';
  height?: number;
  inputStyle?: CSSProperties;
};

export function Search({
  inputRef,
  value,
  onChange,
  placeholder,
  isInModal = false,
  width = 250,
  height,
  inputStyle = {},
}: SearchProps) {
  const { t } = useTranslation();

  const [focused, setFocused] = useState(false);

  const clearButtonPadding = ((height ?? 24) - 8) / 2;

  return (
    <View
      style={{
        ...defaultInputStyle,
        padding: 0,
        flexDirection: 'row',
        alignItems: 'center',

        width,
        height,
        flex: '',
        borderColor: isInModal ? undefined : 'transparent',
        backgroundColor: isInModal ? undefined : theme.formInputBackground,
        ...inputStyle,

        ...(focused && {
          boxShadow: '0 0 0 1px ' + theme.formInputShadowSelected,
          ...(isInModal
            ? {}
            : { backgroundColor: theme.formInputBackgroundSelected }),
        }),
      }}
    >
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

      <Input
        inputRef={inputRef}
        value={value}
        placeholder={placeholder}
        onKeyDown={e => {
          if (e.key === 'Escape') onChange('');
        }}
        onChangeValue={onChange}
        style={{
          width: '100%',
          '::placeholder': {
            color: theme.formInputTextPlaceholder,
            transition: 'color .25s',
          },
          ':focus': isInModal
            ? {}
            : {
                '::placeholder': {
                  color: theme.formInputTextPlaceholderSelected,
                },
              },
          flex: 1,
          '&, &:focus, &:hover': {
            border: 0,
            backgroundColor: 'transparent',
            boxShadow: 'none',
            color: 'inherit',
          },
        }}
        onFocus={() => {
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
        }}
      />

      {value && (
        <View title={t('Clear search term')}>
          <Button
            variant="bare"
            style={{
              padding: `${clearButtonPadding}px 8px ${clearButtonPadding}px ${clearButtonPadding}px`,
            }}
            onPress={() => onChange('')}
          >
            <SvgRemove style={{ width: 8, height: 8 }} />
          </Button>
        </View>
      )}
    </View>
  );
}
