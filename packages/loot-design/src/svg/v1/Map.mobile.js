import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgMap = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M0 0l6 4 8-4 6 4v16l-6-4-8 4-6-4V0zm7 6v11l6-3V3L7 6z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgMap;
