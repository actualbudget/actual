import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgStandBy = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      fillRule="evenodd"
      d="M4.16 4.16l1.42 1.42A6.99 6.99 0 0 0 10 18a7 7 0 0 0 4.42-12.42l1.42-1.42a9 9 0 1 1-11.69 0zM9 0h2v8H9V0z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgStandBy;
