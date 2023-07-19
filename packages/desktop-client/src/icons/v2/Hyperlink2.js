import * as React from 'react';
const SvgHyperlink2 = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    style={{
      color: '#242134',
      ...props.style,
    }}
  >
    <path
      d="M12.406 14.905a1 1 0 0 0-.543 1.307 1 1 0 0 1-.217 1.09l-2.828 2.829a2 2 0 0 1-2.828 0L3.868 18.01a2 2 0 0 1 0-2.829L6.7 12.353a1.013 1.013 0 0 1 1.091-.217 1 1 0 0 0 .763-1.849 3.034 3.034 0 0 0-3.268.652l-2.832 2.828a4.006 4.006 0 0 0 0 5.657l2.122 2.121a4 4 0 0 0 5.656 0l2.829-2.828a3.008 3.008 0 0 0 .651-3.27 1 1 0 0 0-1.306-.542Z"
      fill="currentColor"
    />
    <path
      d="M7.757 16.241a1.011 1.011 0 0 0 1.414 0l7.779-7.778a1 1 0 0 0-1.414-1.414l-7.779 7.778a1 1 0 0 0 0 1.414Z"
      fill="currentColor"
    />
    <path
      d="m21.546 4.574-2.121-2.121a4.006 4.006 0 0 0-5.657 0l-2.829 2.828a3.006 3.006 0 0 0-.651 3.269 1 1 0 1 0 1.849-.764 1 1 0 0 1 .217-1.086l2.828-2.828a2 2 0 0 1 2.829 0l2.121 2.121a2 2 0 0 1 0 2.829L17.3 11.645a1.015 1.015 0 0 1-1.091.217 1 1 0 0 0-.765 1.849 3.026 3.026 0 0 0 3.27-.651l2.828-2.828a4.007 4.007 0 0 0 .004-5.658Z"
      fill="currentColor"
    />
  </svg>
);
export default SvgHyperlink2;
