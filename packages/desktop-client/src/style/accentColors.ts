// Accent color presets with full color scales (50-900)
// Each accent has: light variants for backgrounds, mid for interactive, dark for text

export type AccentColor =
  | 'purple'
  | 'blue'
  | 'teal'
  | 'green'
  | 'orange'
  | 'red'
  | 'pink'
  | 'coral';

export type AccentScale = {
  50: string;
  100: string;
  150: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
};

export const accentColors: Record<AccentColor, AccentScale> = {
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    150: '#e9d5ff',
    200: '#d8b4fe',
    300: '#c084fc',
    400: '#a855f7',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    150: '#bfdbfe',
    200: '#93c5fd',
    300: '#60a5fa',
    400: '#3b82f6',
    500: '#2563eb',
    600: '#1d4ed8',
    700: '#1e40af',
    800: '#1e3a8a',
    900: '#172554',
  },
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    150: '#99f6e4',
    200: '#5eead4',
    300: '#2dd4bf',
    400: '#14b8a6',
    500: '#0d9488',
    600: '#0f766e',
    700: '#115e59',
    800: '#134e4a',
    900: '#042f2e',
  },
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    150: '#bbf7d0',
    200: '#86efac',
    300: '#4ade80',
    400: '#22c55e',
    500: '#16a34a',
    600: '#15803d',
    700: '#166534',
    800: '#14532d',
    900: '#052e16',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    150: '#fed7aa',
    200: '#fdba74',
    300: '#fb923c',
    400: '#f97316',
    500: '#ea580c',
    600: '#c2410c',
    700: '#9a3412',
    800: '#7c2d12',
    900: '#431407',
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    150: '#fecaca',
    200: '#fca5a5',
    300: '#f87171',
    400: '#ef4444',
    500: '#dc2626',
    600: '#b91c1c',
    700: '#991b1b',
    800: '#7f1d1d',
    900: '#450a0a',
  },
  pink: {
    50: '#fdf2f8',
    100: '#fce7f3',
    150: '#fbcfe8',
    200: '#f9a8d4',
    300: '#f472b6',
    400: '#ec4899',
    500: '#db2777',
    600: '#be185d',
    700: '#9d174d',
    800: '#831843',
    900: '#500724',
  },
  coral: {
    50: '#fff5f3',
    100: '#ffe8e4',
    150: '#ffd5cc',
    200: '#ffab9a',
    300: '#ff8066',
    400: '#ff6b4a',
    500: '#f04723',
    600: '#d93d1a',
    700: '#c9351a',
    800: '#a62f1a',
    900: '#892c1c',
  },
};

export const accentColorOptions: [AccentColor, string][] = [
  ['purple', 'Purple'],
  ['blue', 'Blue'],
  ['teal', 'Teal'],
  ['green', 'Green'],
  ['orange', 'Orange'],
  ['red', 'Red'],
  ['pink', 'Pink'],
  ['coral', 'Coral'],
];

// Generate accent-related theme overrides based on selected accent color
export function generateAccentOverrides(
  accent: AccentColor,
  isDark: boolean,
): Record<string, string> {
  const scale = accentColors[accent];

  if (isDark) {
    return {
      // Page accents
      pageTextPositive: scale[200],
      pageTextLink: scale[400],
      pageTextLinkLight: scale[200],

      // Sidebar - very dark with subtle accent tint
      sidebarBackground: `color-mix(in srgb, ${scale[900]} 15%, #08080d)`,
      sidebarItemBackgroundHover: `${scale[800]}30`,
      sidebarItemAccentSelected: scale[200],
      sidebarItemTextSelected: scale[100],

      // Buttons
      buttonMenuSelectedText: scale[900],
      buttonMenuSelectedTextHover: scale[900],
      buttonMenuSelectedBackground: scale[400],
      buttonMenuSelectedBackgroundHover: scale[500],
      buttonMenuSelectedBorder: scale[400],
      buttonPrimaryBackground: scale[600],
      buttonPrimaryBackgroundHover: scale[700],
      buttonPrimaryBorder: scale[600],
      buttonPrimaryShadow: `0 2px 8px ${scale[600]}59`, // 35% opacity
      buttonNormalSelectedBackground: scale[600],

      // Calendar
      calendarSelectedBackground: scale[600],

      // Form inputs
      formInputBackgroundSelection: scale[600],
      formInputBorderSelected: scale[600],
      formInputShadowSelected: `0 0 0 2px ${scale[600]}40`, // 25% opacity
      formInputTextHighlight: scale[400],

      // Checkbox
      checkboxBackgroundSelected: scale[600],
      checkboxBorderSelected: scale[600],
      checkboxShadowSelected: `0 0 0 2px ${scale[600]}40`,
      checkboxToggleBackgroundSelected: scale[600],

      // Pills
      pillTextHighlighted: scale[400],
      pillBackgroundSelected: scale[600],
      pillBorderSelected: scale[600],

      // Table
      tableBorderSelected: scale[400],
      tableBorderHover: scale[600],
      tableRowBackgroundHighlight: `${scale[900]}80`,

      // Menu
      menuItemTextSelected: scale[400],
      menuBorderHover: scale[400],
      menuItemTextHeader: scale[200],
      menuAutoCompleteTextHeader: scale[200],
      menuKeybindingText: scale[300],

      // Mobile
      mobileHeaderBackground: scale[800],
      mobileNavItemSelected: scale[400],
      mobileTransactionSelected: scale[400],
      mobileConfigServerViewTheme: scale[500],

      // Note tags
      noteTagBackground: `${scale[800]}cc`,
      noteTagBackgroundHover: scale[700],
      noteTagDefault: `${scale[800]}cc`,
      noteTagText: scale[100],

      // Floating action bar
      floatingActionBarBackground: scale[800],
      floatingActionBarBorder: `${scale[700]}aa`,

      // Upcoming
      upcomingBackground: scale[900],
      upcomingText: scale[100],

      // Card border accent (optional)
      cardBorder: scale[800],
    };
  } else {
    // Light theme overrides
    return {
      // Page accents
      pageTextPositive: scale[600],
      pageTextLink: scale[600],
      pageTextLinkLight: scale[500],

      // Sidebar - dark with subtle accent tint (same as dark theme for consistency)
      sidebarBackground: `color-mix(in srgb, ${scale[900]} 15%, #102A43)`,
      sidebarItemBackgroundHover: `${scale[700]}20`,
      sidebarItemAccentSelected: scale[100],
      sidebarItemTextSelected: scale[50],

      // Buttons
      buttonMenuSelectedText: scale[50],
      buttonMenuSelectedTextHover: scale[50],
      buttonMenuSelectedBackground: scale[500],
      buttonMenuSelectedBackgroundHover: scale[600],
      buttonMenuSelectedBorder: scale[500],
      buttonPrimaryBackground: scale[500],
      buttonPrimaryBackgroundHover: scale[600],
      buttonPrimaryBorder: scale[500],
      buttonPrimaryShadow: `0 2px 8px ${scale[500]}40`,
      buttonNormalSelectedBackground: scale[500],

      // Calendar
      calendarSelectedBackground: scale[500],

      // Form inputs
      formInputBackgroundSelection: scale[500],
      formInputBorderSelected: scale[500],
      formInputShadowSelected: `0 0 0 2px ${scale[500]}30`,
      formInputTextHighlight: scale[500],

      // Checkbox
      checkboxBackgroundSelected: scale[500],
      checkboxBorderSelected: scale[500],
      checkboxShadowSelected: `0 0 0 2px ${scale[500]}30`,
      checkboxToggleBackgroundSelected: scale[500],

      // Pills
      pillTextHighlighted: scale[600],
      pillBackgroundSelected: scale[500],
      pillBorderSelected: scale[500],

      // Table
      tableBorderSelected: scale[500],
      tableBorderHover: scale[400],
      tableRowBackgroundHighlight: scale[50],

      // Menu
      menuItemTextSelected: scale[600],
      menuBorderHover: scale[500],
      menuItemTextHeader: scale[700],
      menuAutoCompleteTextHeader: scale[700],
      menuKeybindingText: scale[500],

      // Mobile
      mobileHeaderBackground: scale[600],
      mobileNavItemSelected: scale[600],
      mobileTransactionSelected: scale[500],
      mobileConfigServerViewTheme: scale[500],

      // Note tags
      noteTagBackground: scale[100],
      noteTagBackgroundHover: scale[200],
      noteTagDefault: scale[100],
      noteTagText: scale[800],

      // Floating action bar
      floatingActionBarBackground: scale[100],
      floatingActionBarBorder: scale[200],

      // Upcoming
      upcomingBackground: scale[50],
      upcomingText: scale[800],

      // Card border accent
      cardBorder: scale[200],
    };
  }
}
