import { colors } from './source/colors';
import { generatePaletteCss, generateThemeCss } from './source/generate';
import { palette } from './source/palette';

export const paletteCss = generatePaletteCss(palette);
export const lightThemeCss = generateThemeCss('light', colors, palette);
export const darkThemeCss = generateThemeCss('dark', colors, palette);
export const midnightThemeCss = generateThemeCss('midnight', colors, palette);
