import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgTrash = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M6 2l2-2h4l2 2h4v2H2V2h4zM3 6h14l-1 14H4L3 6zm5 2v10h1V8H8zm3 0v10h1V8h-1z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgTrash;
