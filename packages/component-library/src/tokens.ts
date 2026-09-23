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

// Standard component size vocabulary shared by Button, Text and Input.
// Values are looked up per breakpoint group so components can render
// denser on desktop and more comfortable on mobile without hooks.
export type ComponentSize = 'small' | 'medium' | 'large' | 'extra-large';

// Breakpoint groups mirror the view modes in useResponsive:
// narrow <512, small 512-729, medium 730-1099, wide >=1100.
// `narrow` is the base (no media query); every other group is a
// `min-width` query at its breakpoint.
type BreakpointGroup = 'narrow' | 'small' | 'medium' | 'wide';

const breakpointGroupMediaQueries: Record<
  Exclude<BreakpointGroup, 'narrow'>,
  string
> = {
  small: `@media (min-width: ${tokens.breakpoint_small})`,
  medium: `@media (min-width: ${tokens.breakpoint_medium})`,
  wide: `@media (min-width: ${tokens.breakpoint_wide})`,
};

type ComponentSizeTextValues = {
  fontSize: number;
  lineHeight: number;
};

type ComponentSizeControlValues = {
  paddingY: number;
  paddingX: number;
  minHeight?: number;
};

// Typographic scale, aligned with styles.ts (smallText 13, mediumText 15,
// verySmallText 12, mobileMenuItem 17). Mobile steps sizes up one notch
// for readability; desktop stays compact.
export const componentSizeText: Record<
  ComponentSize,
  Record<BreakpointGroup, ComponentSizeTextValues>
> = {
  small: {
    narrow: { fontSize: 12, lineHeight: 16 },
    small: { fontSize: 12, lineHeight: 16 },
    medium: { fontSize: 12, lineHeight: 16 },
    wide: { fontSize: 12, lineHeight: 16 },
  },
  medium: {
    narrow: { fontSize: 13, lineHeight: 18 },
    small: { fontSize: 13, lineHeight: 18 },
    medium: { fontSize: 13, lineHeight: 18 },
    wide: { fontSize: 13, lineHeight: 18 },
  },
  large: {
    narrow: { fontSize: 16, lineHeight: 22 },
    small: { fontSize: 15, lineHeight: 20 },
    medium: { fontSize: 15, lineHeight: 20 },
    wide: { fontSize: 15, lineHeight: 20 },
  },
  'extra-large': {
    narrow: { fontSize: 17, lineHeight: 24 },
    small: { fontSize: 17, lineHeight: 24 },
    medium: { fontSize: 16, lineHeight: 22 },
    wide: { fontSize: 16, lineHeight: 22 },
  },
};

// Padding and min-height for controls (Button, Input). The `medium` row
// reproduces today's default look exactly (5px / 5px 10px, no
// min-height). `extra-large` narrow hits the 40px mobile touch target.
export const componentSizeControl: Record<
  ComponentSize,
  Record<BreakpointGroup, ComponentSizeControlValues>
> = {
  small: {
    narrow: { paddingY: 3, paddingX: 8, minHeight: 24 },
    small: { paddingY: 3, paddingX: 8, minHeight: 24 },
    medium: { paddingY: 3, paddingX: 8, minHeight: 24 },
    wide: { paddingY: 3, paddingX: 8, minHeight: 24 },
  },
  medium: {
    narrow: { paddingY: 5, paddingX: 10 },
    small: { paddingY: 5, paddingX: 10 },
    medium: { paddingY: 5, paddingX: 10 },
    wide: { paddingY: 5, paddingX: 10 },
  },
  large: {
    narrow: { paddingY: 8, paddingX: 12, minHeight: 36 },
    small: { paddingY: 6, paddingX: 12, minHeight: 32 },
    medium: { paddingY: 6, paddingX: 12, minHeight: 32 },
    wide: { paddingY: 6, paddingX: 12, minHeight: 32 },
  },
  'extra-large': {
    narrow: { paddingY: 10, paddingX: 14, minHeight: 40 },
    small: { paddingY: 8, paddingX: 12, minHeight: 36 },
    medium: { paddingY: 8, paddingX: 12, minHeight: 36 },
    wide: { paddingY: 8, paddingX: 12, minHeight: 36 },
  },
};

type ResponsiveStyleObject = Record<string, unknown>;

// Flattens a per-breakpoint-group value table into a single emotion style
// object: the `narrow` values become the base and each larger group is
// emitted as a min-width media query — but only when its values actually
// differ from the previous group, keeping generated CSS lean.
export function sizeResponsiveStyles(
  values: Record<BreakpointGroup, ResponsiveStyleObject>,
): ResponsiveStyleObject {
  const styles: ResponsiveStyleObject = { ...values.narrow };
  let previousGroup: BreakpointGroup = 'narrow';

  for (const group of ['small', 'medium', 'wide'] as const) {
    if (
      JSON.stringify(values[group]) !== JSON.stringify(values[previousGroup])
    ) {
      styles[breakpointGroupMediaQueries[group]] = values[group];
    }
    previousGroup = group;
  }

  return styles;
}
