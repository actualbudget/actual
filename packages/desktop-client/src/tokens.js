export const breakpoints = {
  medium: 512,
  wide: 955,
};

// Provide the same breakpoints in a form usable by CSS media queries
// {
//   breakpoint_medium: '512px',
//   breakpoint_wide: '955px',
// }
const breakpointsInPx = Object.entries(breakpoints).reduce(
  (acc, [key, val]) => {
    acc[`breakpoint_${key}`] = `${val}px`;
    return acc;
  },
  {},
);

export default breakpointsInPx;
