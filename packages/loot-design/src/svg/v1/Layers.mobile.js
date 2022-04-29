import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgLayers = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M10 1l10 6-10 6L0 7l10-6zm6.67 10L20 13l-10 6-10-6 3.33-2L10 15l6.67-4z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgLayers;
