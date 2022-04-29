import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgFormatItalic = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M8 1h9v2H8V1zm3 2h3L8 17H5l6-14zM2 17h9v2H2v-2z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgFormatItalic;
