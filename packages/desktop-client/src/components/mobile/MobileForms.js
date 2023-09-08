import { forwardRef } from 'react';

import { css } from 'glamor';

import { theme } from '../../style';
import Button from '../common/Button';
import Input from '../common/Input';
import Text from '../common/Text';
import View from '../common/View';

export const EDITING_PADDING = 12;
const FIELD_HEIGHT = 40;

export function FieldLabel({ title, flush, style }) {
  return (
    <Text
      style={{
        marginBottom: 5,
        marginTop: flush ? 0 : 25,
        fontSize: 13,
        color: theme.tableRowHeaderText,
        paddingLeft: EDITING_PADDING,
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
  marginLeft: -1,
  marginRight: -1,
  height: FIELD_HEIGHT,
  paddingHorizontal: EDITING_PADDING,
};

export const InputField = forwardRef(function InputField(
  { disabled, style, onUpdate, ...props },
  ref,
) {
  return (
    <Input
      ref={ref}
      autoCorrect="false"
      autoCapitalize="none"
      disabled={disabled}
      onBlur={e => {
        onUpdate?.(e.target.value);
      }}
      style={{
        ...valueStyle,
        ...style,
        backgroundColor: disabled
          ? theme.formInputTextReadOnlySelection
          : 'white',
      }}
      {...props}
    />
  );
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TapField({
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
        backgroundColor: 'white',
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

export function BooleanField({ checked, onUpdate, style }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onUpdate(e.target.checked)}
      className={`${css([
        {
          marginInline: EDITING_PADDING,
        },
        style,
      ])}`}
    />
  );
}
