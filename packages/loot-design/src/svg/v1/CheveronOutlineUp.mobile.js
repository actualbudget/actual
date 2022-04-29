import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgCheveronOutlineUp = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M0 10a10 10 0 1 1 20 0 10 10 0 0 1-20 0zm10 8a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm.7-10.54L14.25 11l-1.41 1.41L10 9.6l-2.83 2.8L5.76 11 10 6.76l.7.7z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgCheveronOutlineUp;
