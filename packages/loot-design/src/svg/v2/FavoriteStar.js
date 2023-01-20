import * as React from 'react';

const SvgFavoriteStar = props => (
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
      d="M23.91 9.113a1.785 1.785 0 0 0-1.453-1.227l-6.132-.926-2.714-5.506a1.863 1.863 0 0 0-3.222 0l-2.78 5.552-6.066.88a1.798 1.798 0 0 0-1 3.068l4.428 4.361-1.028 6.055a1.797 1.797 0 0 0 2.607 1.895l5.488-2.865 5.429 2.858a1.797 1.797 0 0 0 2.607-1.895l-1.011-6.128 4.394-4.286a1.786 1.786 0 0 0 .454-1.836Z"
      fill="currentColor"
    />
  </svg>
);

export default SvgFavoriteStar;
