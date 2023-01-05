/* eslint no-unused-vars: 0 */
/* This file is auto-generated, do not touch! Please edit the SVG file instead. */
import React from 'react';

import { css } from 'glamor';

function Delete({ width, height, style, color = 'currentColor', ...props }) {
  return (
    <svg
      width={width}
      height={height}
      {...props}
      {...css(style)}
      viewBox="0 0 24 24"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line
        fill="none"
        stroke={color}
        className="path"
        strokeWidth="4"
        strokeLinecap="round"
        strokeMiterlimit="10"
        x1="2"
        y1="2"
        x2="22"
        y2="22"
      />
      <line
        fill="none"
        stroke={color}
        className="path"
        strokeWidth="4"
        strokeLinecap="round"
        strokeMiterlimit="10"
        x1="22"
        y1="2"
        x2="2"
        y2="22"
      />
    </svg>
  );
}

export default Delete;
