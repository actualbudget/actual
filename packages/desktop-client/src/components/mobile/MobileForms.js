import { forwardRef } from 'react';

import { colors } from '../../style';
import { Text, Button, View, Input } from '../common';

export const EDITING_PADDING = 12;
const FIELD_HEIGHT = 40;

export function FieldLabel({ title, flush, style }) {
  return (
    <Text
      style={[
        {
          marginBottom: 5,
          marginTop: flush ? 0 : 25,
          fontSize: 13,
          color: colors.n2,
          paddingLeft: EDITING_PADDING,
          textTransform: 'uppercase',
        },
        style,
      ]}
    >
      {title}
    </Text>
  );
}

const valueStyle = {
  borderWidth: 1,
  borderColor: colors.n9,
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
      autoCorrect={false}
      autoCapitalize="none"
      editable={!disabled}
      onEndEditing={e => {
        onUpdate && onUpdate(e.nativeEvent.text);
      }}
      style={[
        valueStyle,
        style,
        { backgroundColor: disabled ? colors.n11 : 'white' },
      ]}
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
  onTap,
}) {
  return (
    <Button
      onPress={!disabled && onTap}
      style={{ backgroundColor: 'white' }}
      activeOpacity={0.05}
    >
      <View
        style={[
          valueStyle,
          { flexDirection: 'row', alignItems: 'center' },
          disabled && { backgroundColor: colors.n11 },
          style,
        ]}
      >
        {children ? (
          children
        ) : (
          <Text style={[{ flex: 1 }, textStyle]}>{value}</Text>
        )}
        {!disabled && rightContent}
      </View>
    </Button>
  );
}

export function BooleanField({ value, onUpdate, style }) {
  return (
    <input
      type="checkbox"
      value={value}
      onChange={onUpdate}
      style={[
        {
          marginHorizontal: EDITING_PADDING,
        },
        style,
      ]}
    />
  );
}
