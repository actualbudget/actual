import * as React from 'react';

const SvgRefreshArrow = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      d="M10.664 20.073a1.249 1.249 0 1 0-.507 2.447A10.739 10.739 0 1 0 2.4 16.1a.25.25 0 0 1-.084.3l-1 .726a1 1 0 0 0 .377 1.787l3.946.849a1.062 1.062 0 0 0 .21.022 1 1 0 0 0 .978-.79l.945-4.4a1 1 0 0 0-1.565-1.02l-1.361.989a.25.25 0 0 1-.386-.128 8.255 8.255 0 1 1 6.205 5.643Z"
      fill="currentColor"
    />
  </svg>
);

export default SvgRefreshArrow;
