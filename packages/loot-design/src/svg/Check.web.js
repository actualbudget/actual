/* This file is auto-generated, do not touch! Please edit the SVG file instead. */
import React from "react";
import { css } from "glamor";

function Check({ width, height, style, color = "black", ...props }) {
  return (
    <svg
      width={width}
      height={height}
      {...props}
      {...css(style)}
      viewBox="0 0 45 35"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="glow" x="-5000%" y="-5000%" width="10000%" height="10000%">
          <feFlood result="flood" floodColor="black" floodOpacity="1" />
          <feComposite
            in="flood"
            result="mask"
            in2="SourceGraphic"
            operator="in"
          />
          <feMorphology
            in="mask"
            result="dilated"
            operator="dilate"
            radius="1.5"
          />
          <feGaussianBlur in="dilated" result="blurred" stdDeviation="2" />
          <feMerge>
            <feMergeNode in="blurred" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        className="path"
        strokeWidth="5"
        strokeMiterlimit="10"
        points="35.636,8.041 18.351,25.324 9.281,16.252"
        filter="glow"
      />
    </svg>
  );
}

export default Check;
