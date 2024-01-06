import React from 'react';

import { css } from 'glamor';

import { theme, type CSSProperties } from '../../style';

type ToggleProps = {
  id: string;
  checked: boolean;
  onChange?: (any) => void;
  onColor?: string;
  style?: CSSProperties;
};

export const Toggle = ({
  id,
  checked,
  onChange,
  onColor,
  style,
}: ToggleProps) => {
  return (
    <div style={{ marginTop: -20, ...style }}>
      <input
        id={id}
        checked={checked}
        onChange={onChange}
        className={`${css({
          height: 0,
          width: 0,
          visibility: 'hidden',
        })}`}
        type="checkbox"
      />
      <label
        style={{ background: checked && onColor }}
        className={`${css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          width: '32px',
          height: '16px',
          background: theme.checkboxToggleBackground,
          borderRadius: '100px',
          position: 'relative',
          transition: 'background-color .2s',
        })}`}
        htmlFor={id}
      >
        <span
          className={`${css(
            {
              content: '',
              position: 'absolute',
              top: '2px',
              left: '2px',
              width: '12px',
              height: '12px',
              borderRadius: '100px',
              transition: '0.2s',
              background: '#fff',
              boxShadow: '0 0 2px 0 rgba(10, 10, 10, 0.29)',
            },
            checked && {
              left: 'calc(100% - 2px)',
              transform: 'translateX(-100%)',
            },
          )}`}
        />
      </label>
    </div>
  );
};
