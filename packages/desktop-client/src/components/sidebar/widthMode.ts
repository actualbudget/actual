export type WidthMode = 'rail' | 'compact' | 'full';

export const WIDTH_MODE_ORDER: WidthMode[] = ['rail', 'compact', 'full'];

export const WIDTH_MODE_PIXELS: Record<WidthMode, number> = {
  rail: 68,
  compact: 216,
  full: 312,
};

export function nextWidthMode(mode: WidthMode): WidthMode {
  const index = WIDTH_MODE_ORDER.indexOf(mode);
  return WIDTH_MODE_ORDER[(index + 1) % WIDTH_MODE_ORDER.length];
}
