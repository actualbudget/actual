import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgArrowButtonUp1 = props => (
  <Svg
    {...props}
    viewBox="0 0 24 24"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M12 10.416a2.643 2.643 0 0 1 1.875.775l9.541 9.541a1.768 1.768 0 0 1-2.5 2.5l-8.739-8.739a.25.25 0 0 0-.354 0l-8.739 8.739a1.768 1.768 0 0 1-2.5-2.5l9.541-9.541A2.643 2.643 0 0 1 12 10.416z"
      fill="currentColor"
    />
    <Path
      d="M12 .25a2.643 2.643 0 0 1 1.875.775l9.541 9.541a1.768 1.768 0 0 1-2.5 2.5l-8.739-8.739a.25.25 0 0 0-.354 0l-8.739 8.739a1.768 1.768 0 0 1-2.5-2.5l9.541-9.541A2.643 2.643 0 0 1 12 .25z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgArrowButtonUp1;
