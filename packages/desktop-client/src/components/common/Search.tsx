import { type Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { SvgRemove, SvgSearchAlternate } from '../../icons/v2';
import { theme } from '../../style';

import { Button } from './Button2';
import { InputWithContent } from './InputWithContent';
import { View } from './View';

type SearchProps = {
  inputRef?: Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isInModal?: boolean;
  width?: number;
};

export function Search({
  inputRef,
  value,
  onChange,
  placeholder,
  isInModal = false,
  width = 250,
}: SearchProps) {
  const { t } = useTranslation();
  return (
    <InputWithContent
      inputRef={inputRef}
      style={{
        width,
        flex: '',
        borderColor: isInModal ? undefined : 'transparent',
        backgroundColor: isInModal ? undefined : theme.formInputBackground,
      }}
      focusStyle={
        isInModal
          ? undefined
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
          <View title={t('Clear search term')}>
            <Button
              variant="bare"
              style={{ padding: 8 }}
              onPress={() => onChange('')}
            >
              <SvgRemove style={{ width: 8, height: 8 }} />
            </Button>
          </View>
        )
      }
      inputStyle={{
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
      }}
      value={value}
      placeholder={placeholder}
      onKeyDown={e => {
        if (e.key === 'Escape') onChange('');
      }}
      onChangeValue={value => onChange(value)}
    />
  );
}
