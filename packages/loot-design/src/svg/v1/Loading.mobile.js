import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  G,
  Path,
  Circle
} from 'react-native-svg';

const SvgLoading = props => {
  let { color = '#fff' } = props;
  return (
    <Svg {...props} viewBox="0 0 38 38" style={{ ...props.style }}>
      <Defs>
        <LinearGradient
          x1="8.042%"
          y1="0%"
          x2="65.682%"
          y2="23.865%"
          id="loading_svg__a"
        >
          <Stop stopColor={color} stopOpacity={0} offset="0%" />
          <Stop stopColor={color} stopOpacity={0.631} offset="63.146%" />
          <Stop stopColor={color} offset="100%" />
        </LinearGradient>
      </Defs>
      <G transform="translate(1 2)" fill="none" fillRule="evenodd">
        <Path
          d="M36 18c0-9.94-8.06-18-18-18"
          stroke="url(#loading_svg__a)"
          strokeWidth={2}
          fill="none"
        />
        <Circle fill="#fff" cx={36} cy={18} r={1} />
      </G>
    </Svg>
  );
};

export default SvgLoading;
