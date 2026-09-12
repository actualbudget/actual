enum BreakpointNames {
  small = 'small',
  medium = 'medium',
  wide = 'wide',
}

type NumericBreakpoints = {
  [key in BreakpointNames]: number;
};

export const breakpoints: NumericBreakpoints = {
  small: 512,
  medium: 730,
  wide: 1100,
};

type BreakpointsPx = {
  [B in keyof NumericBreakpoints as `breakpoint_${B}`]: string;
};

// Provide the same breakpoints in a form usable by CSS media queries
// {
//   breakpoint_small: '512px',
//   breakpoint_medium: '740px',
//   breakpoint_wide: '1100px',
// }
export const tokens: BreakpointsPx = Object.entries(
  breakpoints,
).reduce<BreakpointsPx>(
  (acc, [key, val]) => ({
    ...acc,
    [`breakpoint_${key}`]: `${val}px`,
  }),
  {} as BreakpointsPx,
);

type SpacingSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const spacing: Record<SpacingSize, number> = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

type RadiusSize = 'sm' | 'pill';

export const radius: Record<RadiusSize, number> = {
  sm: 4,
  pill: 999,
};
