import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgDocument = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M4 18h12V6h-4V2H4v16zm-2 1V0h12l4 4v16H2v-1z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgDocument;
