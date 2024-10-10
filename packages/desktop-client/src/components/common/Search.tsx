import { type ComponentPropsWithRef, forwardRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { css, cx } from '@emotion/css';

import { SvgRemove, SvgSearchAlternate } from '../../icons/v2';
import { theme } from '../../style';

import { Button } from './Button2';
import { type Input } from './Input';
import { InputWithContent } from './InputWithContent';
import { View } from './View';

type SearchProps = ComponentPropsWithRef<typeof Input> & {
  isInModal?: boolean;
};

export const Search = forwardRef<HTMLInputElement, SearchProps>(
  (
    {
      value,
      onChangeValue,
      isInModal = false,
      width = 250,
      className,
      ...props
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const defaultClassName = useMemo(
      () =>
        css({
          width,
          flex: '',
          borderColor: isInModal ? undefined : 'transparent',
          backgroundColor: isInModal ? undefined : theme.formInputBackground,
          '&:focus-within': isInModal
            ? {}
            : {
                boxShadow: '0 0 0 1px ' + theme.formInputShadowSelected,
                backgroundColor: theme.formInputBackgroundSelected,
              },
          '& input': {
            '::placeholder': {
              color: theme.formInputTextPlaceholder,
              transition: 'color .25s',
            },
            '[data-focused]': isInModal
              ? {}
              : {
                  '::placeholder': {
                    color: theme.formInputTextPlaceholderSelected,
                  },
                },
          },
        }),
      [isInModal, width],
    );

    return (
      <InputWithContent
        ref={ref}
        className={
          typeof className === 'function'
            ? renderProps => cx(defaultClassName, className(renderProps))
            : cx(defaultClassName, className)
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
                onPress={() => onChangeValue?.('')}
              >
                <SvgRemove style={{ width: 8, height: 8 }} />
              </Button>
            </View>
          )
        }
        value={value}
        onEscape={() => onChangeValue?.('')}
        onChangeValue={onChangeValue}
        {...props}
      />
    );
  },
);

Search.displayName = 'Search';
