import React from 'react';
import './Toggle.css';

type ToggleProps = {
  id: string;
  checked: boolean;
  onChange?: (boolean) => void;
  onColor?: string;
};

const Toggle = ({ id, checked, onChange, onColor }: ToggleProps) => {
  return (
    <div style={{ marginTop: -20 }}>
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
