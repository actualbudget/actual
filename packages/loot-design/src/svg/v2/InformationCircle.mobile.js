import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgInformationCircle = props => (
  <Svg
    {...props}
    viewBox="0 0 24 24"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M12 0a12 12 0 1 0 12 12A12.013 12.013 0 0 0 12 0zm.25 5a1.5 1.5 0 1 1-1.5 1.5 1.5 1.5 0 0 1 1.5-1.5zm2.25 13.5h-4a1 1 0 0 1 0-2h.75a.25.25 0 0 0 .25-.25v-4.5a.25.25 0 0 0-.25-.25h-.75a1 1 0 0 1 0-2h1a2 2 0 0 1 2 2v4.75a.25.25 0 0 0 .25.25h.75a1 1 0 1 1 0 2z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgInformationCircle;
