import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgEquals = props => (
  <Svg
    {...props}
    viewBox="0 0 23 11"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M23 1.5A1.5 1.5 0 0 1 21.5 3h-20a1.5 1.5 0 0 1 0-3h20A1.5 1.5 0 0 1 23 1.5zm0 8a1.5 1.5 0 0 1-1.5 1.5h-20a1.5 1.5 0 0 1 0-3h20A1.5 1.5 0 0 1 23 9.5z"
      fillRule="nonzero"
      fill="currentColor"
    />
  </Svg>
);

export default SvgEquals;
