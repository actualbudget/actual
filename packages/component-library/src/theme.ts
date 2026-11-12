import { colors } from './themes/source/colors';
import { toCssVariable } from './themes/source/generate';
import type { TokenDefinition } from './themes/source/types';

export const theme = Object.fromEntries(
  Object.entries<TokenDefinition>(colors).map(([name, definition]) => [
    name,
    toCssVariable(name, definition),
  ]),
) as Record<keyof typeof colors, string>;
