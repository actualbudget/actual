import { forwardRef } from 'react';

import { css } from 'glamor';

import { theme, styles } from '../../style';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Text } from '../common/Text';
import { View } from '../common/View';

const FIELD_HEIGHT = 40;

export function FieldLabel({ title, flush, style }) {
  return (
    <Text
      style={{
        marginBottom: 5,
        marginTop: flush ? 0 : 25,
        fontSize: 13,
        color: theme.tableRowHeaderText,
        padding: `0 ${styles.mobileEditingPadding}px`,
        textTransform: 'uppercase',
        userSelect: 'none',
        ...style,
      }}
    >
      {title}
    </Text>
  );
}

const valueStyle = {
  borderWidth: 1,
  borderColor: theme.formInputBorder,
  marginLeft: 8,
  marginRight: 8,
  height: FIELD_HEIGHT,
};

export const InputField = forwardRef(function InputField(
  { disabled, style, onUpdate, ...props },
  ref,
) {
  return (
    <Input
      inputRef={ref}
      autoCorrect="false"
      autoCapitalize="none"
      disabled={disabled}
      onBlur={e => {
        onUpdate?.(e.target.value);
      }}
      style={{
        ...valueStyle,
        ...style,
        color: disabled ? theme.tableTextInactive : theme.tableText,
        backgroundColor: disabled
          ? theme.formInputTextReadOnlySelection
          : theme.tableBackground,
      }}
      {...props}
    />
  );
});

export function TapField({
  value,
  children,
  disabled,
  rightContent,
  style,
  textStyle,
  onClick,
  ...props
}) {
  return (
    <Button
      as={View}
      onClick={!disabled ? onClick : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        ...style,
        ...valueStyle,
        backgroundColor: theme.tableBackground,
        ...(disabled && {
          backgroundColor: theme.formInputTextReadOnlySelection,
        }),
      }}
      bounce={false}
      activeStyle={{
        opacity: 0.5,
        boxShadow: 'none',
      }}
      hoveredStyle={{
        boxShadow: 'none',
      }}
      // activeOpacity={0.05}
      {...props}
    >
      {children ? (
        children
      ) : (
        <Text style={{ flex: 1, userSelect: 'none', ...textStyle }}>
          {value}
        </Text>
      )}
      {!disabled && rightContent}
    </Button>
  );
}

export function BooleanField({ checked, onUpdate, style, disabled = false }) {
  return (
    <input
      disabled={disabled ? true : undefined}
      type="checkbox"
      checked={checked}
      onChange={e => onUpdate(e.target.checked)}
      className={`${css([
        {
          marginInline: styles.mobileEditingPadding,
          flexShrink: 0,
          appearance: 'none',
          outline: 0,
          border: '1px solid ' + theme.formInputBorder,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.checkboxText,
          backgroundColor: theme.tableBackground,
          ':checked': {
            border: '1px solid ' + theme.checkboxBorderSelected,
            backgroundColor: theme.checkboxBackgroundSelected,
            '::after': {
              display: 'block',
              background:
                theme.checkboxBackgroundSelected +
                // eslint-disable-next-line rulesdir/typography
                ' url(\'data:image/svg+xml; utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="white" d="M0 11l2-2 5 5L18 3l2 2L7 18z"/></svg>\') 15px 15px',
              width: 15,
              height: 15,
              content: ' ',
            },
          },
        },
        style,
      ])}`}
    />
  );
}
