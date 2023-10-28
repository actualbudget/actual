import * as React from 'react';
import type { SVGProps } from 'react';
const SvgEye = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path
      d="M18.502 12.712c0 2.368-3.137 4.289-7.003 4.289S4.5 15.08 4.5 12.712c0-2.364 3.133-4.285 6.999-4.285 3.866 0 7.003 1.921 7.003 4.285Zm0 0"
      style={{
        fill: 'none',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        stroke: '#000',
        strokeOpacity: 1,
        strokeMiterlimit: 4,
      }}
      transform="matrix(.96 0 0 .96 1 .48)"
      fill="currentColor"
    />
    <path
      d="M13.249 12.712a1.749 1.749 0 0 1-1.054 1.644 1.757 1.757 0 0 1-1.92-.354 1.752 1.752 0 0 1 1.225-3.003c.459-.004.902.175 1.232.496.325.322.513.761.517 1.217Zm0 0"
      style={{
        fill: 'none',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        stroke: '#000',
        strokeOpacity: 1,
        strokeMiterlimit: 4,
      }}
      transform="matrix(.96 0 0 .96 1 .48)"
      fill="currentColor"
    />
    <path
      d="M10.32 8.57a.72.72 0 1 0 1.442 0Zm1.442-3.289a.72.72 0 1 0-1.441 0Zm5.8 1.973a.72.72 0 0 0-.316-.969.718.718 0 0 0-.969.313Zm-2.664 2.05a.722.722 0 0 0 .317.97c.351.18.785.039.969-.317ZM5.801 6.599a.715.715 0 0 0-.969-.313.722.722 0 0 0-.312.969Zm.097 3.359a.72.72 0 0 0 .97.316.718.718 0 0 0 .312-.968Zm5.864-1.387V5.281H10.32v3.29Zm4.515-1.972-1.379 2.707 1.286.652 1.378-2.703ZM4.52 7.254l1.378 2.703 1.282-.652L5.8 6.598Zm0 0"
      style={{
        stroke: 'none',
        fillRule: 'nonzero',
        fill: '#000',
        fillOpacity: 1,
      }}
      transform="translate(1)"
      fill="currentColor"
    />
  </svg>
);
export default SvgEye;
