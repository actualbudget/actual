import * as React from 'react';

const SvgExpandArrow = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 25 15"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      fill="currentColor"
      d="M24.483.576c-.309-.327-.674-.49-1.097-.49H1.56C1.137.086.771.25.463.576A1.635 1.635 0 0 0 0 1.737c0 .448.154.834.463 1.161l10.913 11.558c.31.327.675.49 1.097.49.422 0 .788-.163 1.096-.49L24.483 2.898c.308-.327.463-.713.463-1.16 0-.448-.155-.835-.463-1.162Z"
    />
  </svg>
);

export default SvgExpandArrow;
