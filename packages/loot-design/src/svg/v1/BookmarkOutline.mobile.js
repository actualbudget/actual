import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgBookmarkOutline = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M2 2c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v18l-8-4-8 4V2zm2 0v15l6-3 6 3V2H4z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgBookmarkOutline;
