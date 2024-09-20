import React, {
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  forwardRef,
  type ReactNode,
  type CSSProperties,
} from 'react';

import { css } from '@emotion/css';

import { theme, styles } from '../../style';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Text } from '../common/Text';
import { Toggle } from '../common/Toggle';
import { View } from '../common/View';

type FieldLabelProps = {
  title: string;
  flush?: boolean;
  style?: CSSProperties;
};

export function FieldLabel({ title, flush, style }: FieldLabelProps) {
  return (
    <Text
      style={{
        marginBottom: 5,
        marginTop: flush ? 0 : 25,
        fontSize: 14,
        color: theme.tableRowHeaderText,
        padding: `0 ${styles.mobileEditingPadding}px`,
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
  height: styles.mobileMinHeight,
};

type InputFieldProps = ComponentPropsWithRef<typeof Input>;

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ disabled, style, onUpdate, ...props }, ref) => {
    return (
      <Input
        inputRef={ref}
        autoCorrect="false"
        autoCapitalize="none"
        disabled={disabled}
        onUpdate={onUpdate}
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
  },
);

InputField.displayName = 'InputField';

type TapFieldProps = ComponentPropsWithRef<typeof Button> & {
  rightContent?: ReactNode;
};

export const TapField = forwardRef<HTMLButtonElement, TapFieldProps>(
  (
    {
      value,
      children,
      disabled,
      rightContent,
      style,
      textStyle,
      onClick,
      ...props
    },
    ref,
  ) => {
    return (
      <Button
        // @ts-expect-error fix this later
        as={View}
        ref={ref}
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
  },
);

TapField.displayName = 'TapField';

type ToggleFieldProps = ComponentPropsWithoutRef<typeof Toggle>;

export function ToggleField({
  id,
  isOn,
  onToggle,
  style,
  className,
  isDisabled = false,
}: ToggleFieldProps) {
  return (
    <Toggle
      id={id}
      isOn={isOn}
      isDisabled={isDisabled}
      onToggle={onToggle}
      style={style}
      className={String(
        css([
          {
            '& [data-toggle-container]': {
              width: 50,
              height: 24,
            },
            '& [data-toggle]': {
              width: 20,
              height: 20,
            },
          },
          className,
        ]),
      )}
    />
  );
}
