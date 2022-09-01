/* This file is auto-generated, do not touch! Please edit the SVG file instead. */
import React from 'react';

import {
  Svg,
  Circle,
  Ellipse,
  G,
  LinearGradient,
  RadialGradient,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
  Symbol,
  Text,
  Use,
  Defs,
  Stop
} from 'mobile/node_modules/react-native-svg';

function Loading({ width, height, style, color = 'black', ...props }) {
  return (
    <Svg
      width={width}
      height={height}
      {...props}
      style={style}
      viewBox="0 0 38 38"
      xmlns="http://www.w3.org/2000/svg"
    >
      <Defs>
        <LinearGradient x1="8.042%" y1="0%" x2="65.682%" y2="23.865%" id="a">
          <Stop stopColor="black" stopOpacity="0" offset="0%" />
          <Stop stopColor="black" stopOpacity=".631" offset="63.146%" />
          <Stop stopColor="black" offset="100%" />
        </LinearGradient>
      </Defs>
      <G fill="none" fillRule="evenodd">
        <G transform="translate(1 2)">
          <Path
            d="M36 18c0-9.94-8.06-18-18-18"
            id="Oval-2"
            stroke="url(#a)"
            strokeWidth="2"
          />
          <Circle fill={color} className="path" cx="36" cy="18" r="1" />
        </G>
      </G>
    </Svg>
  );
}

export default Loading;
