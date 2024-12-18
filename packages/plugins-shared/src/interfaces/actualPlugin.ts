import React, { CSSProperties, ReactNode } from 'react';

import { ThemeDefinition } from './themeDefinition';

export interface ActualPlugin {
  name: string;
  version: string;
  availableThemes?: (darkMode: boolean) => string[];
  getThemeIcon?: (
    themeName: string,
    darkMode: boolean,
    properties?: CSSProperties,
  ) => JSX.Element;
  getThemeSchema?: (themeName: string, darkMode: boolean) => ThemeDefinition;
  // hooks: {
  //   menuItems?: () => React.ReactNode[];
  //   dropdownItems?: () => React.ReactNode[];
  //   pages?: () => { path: string; component: React.FC }[];
  //   beforeMethod?: (methodName: string, ...args: any[]) => void;
  //   afterMethod?: (methodName: string, result: any, ...args: any[]) => void;
  //   overrideTheme?: () => string;
  // };
}
