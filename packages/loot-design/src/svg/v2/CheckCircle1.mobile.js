import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgCheckCircle1 = props => (
  <Svg
    {...props}
    viewBox="0 0 24 24"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M12 0a12 12 0 1 0 12 12A12.014 12.014 0 0 0 12 0zm6.927 8.2l-6.845 9.289a1.011 1.011 0 0 1-1.43.188l-4.888-3.908a1 1 0 1 1 1.25-1.562l4.076 3.261 6.227-8.451a1 1 0 1 1 1.61 1.183z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgCheckCircle1;
