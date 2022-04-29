import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgDirections = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M10 0l10 10-10 10L0 10 10 0zM6 10v3h2v-3h3v3l4-4-4-4v3H8a2 2 0 0 0-2 2z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgDirections;
