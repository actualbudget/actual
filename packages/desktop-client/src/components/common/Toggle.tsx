import React from 'react';

import { type CSSProperties } from '../../style';
import './Toggle.css';

type ToggleProps = {
  id: string;
  checked: boolean;
  onChange?: (boolean) => void;
  onColor?: string;
  style?: CSSProperties;
};

const Toggle = ({ id, checked, onChange, onColor, style }: ToggleProps) => {
  return (
    <div style={{ marginTop: -20, ...style }}>
      <input
        checked={checked}
        onChange={onChange}
        className="react-switch-checkbox"
        id={id}
        type="checkbox"
      />
      <label
        style={{ background: checked && onColor }}
        className="react-switch-label"
        htmlFor={id}
      >
        <span className={`react-switch-button`} />
      </label>
    </div>
  );
};

export default Toggle;
