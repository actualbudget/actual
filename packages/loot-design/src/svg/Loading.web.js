/* This file is auto-generated, do not touch! Please edit the SVG file instead. */
import React from 'react';
import { css } from 'glamor';

function Loading({ width, height, style, color = 'black', ...props }) {
  return (
    <svg
      width={width}
      height={height}
      {...props}
      {...css(style)}
      viewBox="0 0 38 38"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient x1="8.042%" y1="0%" x2="65.682%" y2="23.865%" id="a">
          <stop stopColor="black" stopOpacity="0" offset="0%" />
          <stop stopColor="black" stopOpacity=".631" offset="63.146%" />
          <stop stopColor="black" offset="100%" />
        </linearGradient>
      </defs>
      <g fill="none" fillRule="evenodd">
        <g transform="translate(1 2)">
          <path
            d="M36 18c0-9.94-8.06-18-18-18"
            id="Oval-2"
            stroke="url(#a)"
            strokeWidth="2"
          />
          <circle fill={color} className="path" cx="36" cy="18" r="1" />
        </g>
      </g>
    </svg>
  );
}

export default Loading;
