import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgPencilWriteAlternate = props => (
  <Svg
    {...props}
    viewBox="0 0 24 24"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M20 11.491a1 1 0 0 0-1 1v8.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1h10a1 1 0 0 0 0-2H3a3 3 0 0 0-3 3v17a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3v-8.5a1 1 0 0 0-1-1z"
      fill="currentColor"
    />
    <Path
      d="M18.818 3.051a.516.516 0 0 0-.707 0L10.3 10.865a.5.5 0 0 0-.111.168l-1.416 3.535a.5.5 0 0 0 .111.539.519.519 0 0 0 .539.11l3.535-1.417a.5.5 0 0 0 .168-.111L20.94 5.88a.5.5 0 0 0 0-.707zM23.415.577a2.047 2.047 0 0 0-2.828 0l-1.061 1.06a.5.5 0 0 0 0 .707l2.12 2.121a.5.5 0 0 0 .707 0l1.061-1.06a2 2 0 0 0 0-2.828z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgPencilWriteAlternate;
