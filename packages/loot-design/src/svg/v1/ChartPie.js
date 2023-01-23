import * as React from 'react';

const SvgChartPie = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      d="M19.95 11A10 10 0 1 1 9 .05V11h10.95zm-.08-2.6H11.6V.13a10 10 0 0 1 8.27 8.27z"
      fill="currentColor"
    />
  </svg>
);

export default SvgChartPie;
