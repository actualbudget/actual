import React from 'react';
// import { Switch } from 'react-native';
import { useSwitch } from '@react-aria/switch';
import { VisuallyHidden } from '@react-aria/visually-hidden';
import { useToggleState } from '@react-stately/toggle';
import { useFocusRing } from '@react-aria/focus';

import {
  Button,
  Text,
  // TextInput,
  View
} from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

export const EDITING_PADDING = 12;
export const FIELD_HEIGHT = 40;

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
          textTransform: 'uppercase'
        },
        style
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
  paddingHorizontal: EDITING_PADDING
};

export const InputField = React.forwardRef(function InputField(
  { disabled, style, onUpdate, ...props },
  ref
) {
  return (
    <input // TextInput
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
        { backgroundColor: disabled ? colors.n11 : 'white' }
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
  onTap
}) {
  return (
    <Button
      onClick={!disabled && onTap}
      style={{ backgroundColor: 'white' }}
      activeOpacity={0.05}
    >
      <View
        style={[
          valueStyle,
          { flexDirection: 'row', alignItems: 'center' },
          disabled && { backgroundColor: colors.n11 },
          style
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
    <Switch
      value={value}
      onValueChange={onUpdate}
      style={[
        {
          marginHorizontal: EDITING_PADDING
        },
        style
      ]}
    />
  );
}

function Switch(props) {
  let state = useToggleState(props);
  let ref = React.useRef();
  let { inputProps } = useSwitch(props, state, ref);
  let { isFocusVisible, focusProps } = useFocusRing();

  return (
    <label style={{ display: 'flex', alignItems: 'center' }}>
      <VisuallyHidden>
        <input {...inputProps} {...focusProps} ref={ref} />
      </VisuallyHidden>
      <svg width={40} height={24} aria-hidden="true" style={{ marginRight: 4 }}>
        <rect
          x={4}
          y={4}
          width={32}
          height={16}
          rx={8}
          fill={state.isSelected ? 'orange' : 'gray'}
        />
        <circle cx={state.isSelected ? 28 : 12} cy={12} r={5} fill="white" />
        {isFocusVisible && (
          <rect
            x={1}
            y={1}
            width={38}
            height={22}
            rx={11}
            fill="none"
            stroke="orange"
            strokeWidth={2}
          />
        )}
      </svg>
      {props.children}
    </label>
  );
}
