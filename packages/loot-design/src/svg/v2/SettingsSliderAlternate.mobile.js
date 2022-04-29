import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgSettingsSliderAlternate = props => (
  <Svg
    {...props}
    viewBox="0 0 24 24"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M4.5 17.5h6.646a3.5 3.5 0 0 0 6.708 0H19.5a1 1 0 0 0 0-2h-1.646a3.5 3.5 0 0 0-6.708 0H4.5a1 1 0 0 0 0 2zm10-2.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM19.5 6.5h-6.646a3.5 3.5 0 0 0-6.708 0H4.5a1 1 0 0 0 0 2h1.646a3.5 3.5 0 0 0 6.708 0H19.5a1 1 0 1 0 0-2zM9.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgSettingsSliderAlternate;
