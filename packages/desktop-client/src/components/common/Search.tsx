import { useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgRemove, SvgSearchAlternate } from '@actual-app/components/icons/v2';
import { baseInputStyle, Input } from '@actual-app/components/input';
import { type CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

type SearchProps = {
  ref?: Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isInModal?: boolean;
  width?: number | '100%';
  height?: number;
  style?: CSSProperties;
};

export function Search({
  ref,
  value,
  onChange,
  placeholder,
  isInModal = false,
  width = 250,
  height,
  style,
}: SearchProps) {
  const { t } = useTranslation();

  const [focused, setFocused] = useState(false);

  const clearButtonPadding = ((height ?? 24) - 8) / 2;

  return (
    <View
      style={{
        ...baseInputStyle,
        padding: 0,
        flexDirection: 'row',
        alignItems: 'center',

        width,
        height,
        flex: '',
        borderColor: isInModal ? undefined : 'transparent',
        backgroundColor: isInModal ? undefined : theme.formInputBackground,
        ...style,
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
        ref={ref}
        value={value}
        placeholder={placeholder}
        onEscape={() => onChange('')}
        onChangeValue={onChange}
        className={css({
          width: '100%',
          '::placeholder': {
            color: theme.formInputTextPlaceholder,
            transition: 'color .25s',
          },
          '&[data-focused]': isInModal
            ? {}
            : {
                '::placeholder': {
                  color: theme.formInputTextPlaceholderSelected,
                },
              },
          flex: 1,
          '&, &[data-focused], &[data-hovered]': {
            border: 0,
            backgroundColor: 'transparent',
            boxShadow: 'none',
            color: 'inherit',
          },
        })}
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
