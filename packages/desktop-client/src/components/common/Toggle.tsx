import React, { type HTMLProps } from 'react';
import './Toggle.css';

import { css } from 'glamor';

import { type CSSProperties, theme } from '../../style';
type ToggleProps ={
  isOn;
  handleToggle?;
  onColor?;
}

const Toggle = ({isOn, handleToggle, onColor}: ToggleProps) => {
  return (
    <>
    <input
      checked={isOn}
      onChange={handleToggle}
      className="react-switch-checkbox"
      id={`react-switch-new`}
      type="checkbox"
    />
    <label
      style={{ background: isOn && onColor }}
      className="react-switch-label"
      htmlFor={`react-switch-new`}
    >
      <span className={`react-switch-button`} />
    </label>
    </>
  );
};

export default Toggle;

type CheckboxProps = Omit<HTMLProps<HTMLInputElement>, 'type'> & {
  style?: CSSProperties;
};

export const Checkbox = (props: CheckboxProps) => {
  return (
    <input
      type="checkbox"
      {...props}
      className={`${css(
        [
          {
            margin: 0,
            flexShrink: 0,
            marginRight: 6,
            width: 15,
            height: 15,
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
                  ' url(\'data:image/svg+xml; utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="white" d="M0 11l2-2 5 5L18 3l2 2L7 18z"/></svg>\') 9px 9px',
                width: 9,
                height: 9,
                content: ' ',
              },
            },
            '&.focus-visible:focus': {
              '::before': {
                position: 'absolute',
                top: -5,
                bottom: -5,
                left: -5,
                right: -5,
                border: '2px solid ' + theme.checkboxBorderSelected,
                borderRadius: 6,
                content: ' ',
              },
            },
          },
        ],
        props.style,
      )}`}
    />
  );
};
