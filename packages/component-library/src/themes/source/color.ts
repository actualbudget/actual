import {
  clampChroma,
  converter,
  formatHex,
  formatHex8,
  interpolate,
  modeHsl,
  modeLrgb,
  modeOklab,
  modeOklch,
  modeRgb,
  parse,
  useMode as registerMode,
  wcagContrast,
} from 'culori/fn';

registerMode(modeRgb);
registerMode(modeHsl);
registerMode(modeLrgb);
registerMode(modeOklab);
registerMode(modeOklch);

export {
  clampChroma,
  converter,
  formatHex,
  formatHex8,
  interpolate,
  parse,
  wcagContrast,
};
