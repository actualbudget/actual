import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgEditPencil = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M12.3 3.7l4 4L4 20H0v-4L12.3 3.7zm1.4-1.4L16 0l4 4-2.3 2.3-4-4z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgEditPencil;
