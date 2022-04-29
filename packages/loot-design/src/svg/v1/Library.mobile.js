import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgLibrary = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M0 6l10-6 10 6v2H0V6zm0 12h20v2H0v-2zm2-2h16v2H2v-2zm0-8h4v8H2V8zm6 0h4v8H8V8zm6 0h4v8h-4V8z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgLibrary;
