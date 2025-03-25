import React, {
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  forwardRef,
  type ReactNode,
  type CSSProperties,
} from 'react';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Toggle } from '@actual-app/components/toggle';
import { css } from '@emotion/css';

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
  textStyle?: CSSProperties;
};

const defaultTapFieldStyle: ComponentPropsWithoutRef<
  typeof Button
>['style'] = ({ isDisabled, isPressed, isHovered }) => ({
  ...valueStyle,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: theme.tableBackground,
  ...(isDisabled && {
    backgroundColor: theme.formInputTextReadOnlySelection,
  }),
  ...(isPressed
    ? {
        opacity: 0.5,
        boxShadow: 'none',
      }
    : {}),
  ...(isHovered
    ? {
        boxShadow: 'none',
      }
    : {}),
});

export const TapField = forwardRef<HTMLButtonElement, TapFieldProps>(
  ({ value, children, rightContent, style, textStyle, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        bounce={false}
        style={renderProps => ({
          ...defaultTapFieldStyle(renderProps),
          ...(typeof style === 'function' ? style(renderProps) : style),
        })}
        {...props}
      >
        {children ? (
          children
        ) : (
          <Text
            style={{
              flex: 1,
              userSelect: 'none',
              textAlign: 'left',
              ...textStyle,
            }}
          >
            {value}
          </Text>
        )}
        {!props.isDisabled && rightContent}
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
