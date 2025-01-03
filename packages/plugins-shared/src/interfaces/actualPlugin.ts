import { CSSProperties } from 'react';

import { ThemeDefinition } from './themeDefinition';

export interface ActualPlugin {
  name: string;
  version: string;
  availableThemes?: () => string[];
  getThemeIcon?: (themeName: string, properties?: CSSProperties) => JSX.Element;
  getThemeSchema?: (themeName: string) => ThemeDefinition;
  uninstall: (db: IDBDatabase) => void;
}
