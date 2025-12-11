import React, { type CSSProperties } from 'react';

import { css } from '@emotion/css';

import { theme } from './theme';
import { View } from './View';

type ToggleProps = {
  id: string;
  isOn: boolean;
  isDisabled?: boolean;
  onToggle?: (isOn: boolean) => void;
  className?: string;
  style?: CSSProperties;
};

export const Toggle = ({
  id,
  isOn,
  isDisabled = false,
  onToggle,
  className,
  style,
}: ToggleProps) => {
  return (
    <View style={style} className={className}>
      <input
        id={id}
        checked={isOn}
        disabled={isDisabled}
        onChange={e => onToggle?.(e.target.checked)}
        className={css({
          height: 0,
          width: 0,
          visibility: 'hidden',
        })}
        type="checkbox"
      />
      {/* oxlint-disable-next-line eslint-plugin-jsx-a11y(label-has-associated-control) */}
      <label
        data-toggle-container
        data-on={isOn}
        className={String(
          css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            width: '32px',
            height: '16px',
            borderRadius: '100px',
            position: 'relative',
            transition: 'background-color .2s',
            backgroundColor: isOn
              ? theme.checkboxToggleBackgroundSelected
              : theme.checkboxToggleBackground,
          }),
        )}
        htmlFor={id}
      >
        <span
          data-toggle
          data-on={isOn}
          className={css(
            {
              // eslint-disable-next-line actual/typography
              content: '" "',
              position: 'absolute',
              top: '2px',
              left: '2px',
              width: '12px',
              height: '12px',
              borderRadius: '100px',
              transition: '0.2s',
              boxShadow: '0 0 2px 0 rgba(10, 10, 10, 0.29)',
              backgroundColor: isDisabled
                ? theme.checkboxToggleDisabled
                : '#fff',
            },
            isOn && {
              left: 'calc(100% - 2px)',
              transform: 'translateX(-100%)',
            },
          )}
        />
      </label>
    </View>
  );
};
