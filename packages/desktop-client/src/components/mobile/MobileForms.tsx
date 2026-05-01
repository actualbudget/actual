import React from 'react';
import type {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  CSSProperties,
  ReactNode,
} from 'react';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Toggle } from '@actual-app/components/toggle';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

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

const hideNativeDateIconClassName = css({
  '&::-webkit-calendar-picker-indicator': {
    display: 'none',
  },
});

type InputFieldProps = ComponentPropsWithRef<typeof Input> & {
  icon?: ReactNode;
};

export function InputField({
  disabled,
  style,
  onUpdate,
  icon,
  className,
  ref,
  ...props
}: InputFieldProps) {
  if (icon) {
    return (
      <View
        style={{
          ...valueStyle,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 8,
          gap: 8,
          backgroundColor: disabled
            ? theme.formInputTextReadOnlySelection
            : theme.tableBackground,
        }}
      >
        <View style={{ color: theme.pageTextSubdued, flexShrink: 0 }}>
          {icon}
        </View>
        <Input
          ref={ref}
          autoCorrect="false"
          autoCapitalize="none"
          disabled={disabled}
          onUpdate={onUpdate}
          style={{
            flex: 1,
            border: 'none',
            backgroundColor: 'transparent',
            height: '100%',
            padding: 0,
            color: disabled ? theme.tableTextInactive : theme.tableText,
            ...style,
          }}
          {...props}
          className={renderProps =>
            cx(
              hideNativeDateIconClassName,
              typeof className === 'function'
                ? className(renderProps)
                : className,
            )
          }
        />
      </View>
    );
  }

  return (
    <Input
      ref={ref}
      autoCorrect="false"
      autoCapitalize="none"
      disabled={disabled}
      onUpdate={onUpdate}
      className={className}
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
}

InputField.displayName = 'InputField';

type TapFieldProps = ComponentPropsWithRef<typeof Button> & {
  icon?: ReactNode;
  placeholder?: string;
  rightContent?: ReactNode;
  alwaysShowRightContent?: boolean;
  textStyle?: CSSProperties;
};

const defaultTapFieldClassName = () =>
  css({
    ...valueStyle,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.tableBackground,
    '&[data-disabled]': {
      backgroundColor: theme.formInputTextReadOnlySelection,
    },
    '&[data-pressed]': {
      opacity: 0.5,
      boxShadow: 'none',
    },
    '&[data-hovered]': {
      boxShadow: 'none',
    },
  });

export function TapField({
  value,
  children,
  className,
  icon,
  placeholder,
  rightContent,
  alwaysShowRightContent,
  textStyle,
  ref,
  ...props
}: TapFieldProps) {
  const showPlaceholder = !value && !!placeholder;
  return (
    <Button
      ref={ref}
      bounce={false}
      className={renderProps =>
        cx(
          defaultTapFieldClassName(),
          typeof className === 'function' ? className(renderProps) : className,
        )
      }
      {...props}
    >
      {children ? (
        children
      ) : (
        <>
          {icon && (
            <View
              style={{
                color: theme.pageTextSubdued,
                marginRight: 8,
                flexShrink: 0,
              }}
            >
              {icon}
            </View>
          )}
          <Text
            style={{
              flex: 1,
              userSelect: 'none',
              textAlign: 'left',
              color: showPlaceholder
                ? theme.formInputTextPlaceholder
                : undefined,
              ...textStyle,
            }}
          >
            {showPlaceholder ? placeholder : value}
          </Text>
        </>
      )}
      {(!props.isDisabled || alwaysShowRightContent) && rightContent}
    </Button>
  );
}

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
