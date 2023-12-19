import React, { type HTMLProps } from 'react';
import './Toggle.css';

import { css } from 'glamor';

import { type CSSProperties, theme } from '../../style';
type ToggleProps ={
  id?: string
  isOn;
  handleToggle?;
  onColor?;
}

const Toggle = ({id, isOn, handleToggle, onColor}: ToggleProps) => {
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