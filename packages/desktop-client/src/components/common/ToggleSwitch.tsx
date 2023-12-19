import React from "react";
import './ToggleSwitch.css';

/*
Toggle Switch Component
Note: id, checked and onChange are required for ToggleSwitch component to function.
The props name, small, disabled and optionLabels are optional.
Usage: <ToggleSwitch id={id} checked={value} onChange={checked => setValue(checked)}} />
*/

const ToggleSwitch = ({ id, name, checked, onChange, small }: ToggleSwitchProps) => {

  return (
    <div className={"toggle-switch" + (small ? " small-switch" : "")}>
      <input
        type="checkbox"
        name={name}
        className="toggle-switch-checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        />
        {id ? (
          <label 
            className="toggle-switch-label"
            htmlFor={id}
            tabIndex={ 1 }
          >
            <span
              className={"toggle-switch-inner"}
              tabIndex={-1}
            />
            <span
              className={"toggle-switch-switch"}
              tabIndex={-1}
            />
          </label>
        ) : null}
      </div>
    );
}

type ToggleSwitchProps = {
  id: string;
  checked: boolean;
  onChange;
  name?: string;
  small?: boolean;
};

export default ToggleSwitch;