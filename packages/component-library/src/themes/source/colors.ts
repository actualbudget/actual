import type { TokenDefinition } from './types';

export const colors = {
  accent: {
    light: 'purple500',
    dark: 'purple400',
    midnight: 'purple400',
    description:
      'The one color a theme sets to restyle primary buttons, links, focus rings and selection.',
  },
  accentContrast: {
    all: { derive: 'accentContrast' },
    description: 'Text and icons on an accent fill.',
  },
  accentHover: {
    all: { derive: 'accentHover' },
    description: 'Hovered and pressed accent fill.',
  },
  accentText: {
    all: { derive: 'accentText' },
    description: 'The accent as text or an icon on the page and on tables.',
  },
  accentBorder: {
    all: { derive: 'accentBorder' },
    description: 'Selected outlines and focus rings.',
  },
  accentSubtle: {
    all: { derive: 'accentSubtle' },
    description: 'Tinted surface for selected rows and pills.',
  },
  accentSubtleText: {
    all: { derive: 'accentSubtleText' },
    description: 'Accent text on the tinted surface.',
  },

  backgroundPage: {
    light: 'navy100',
    dark: 'gray900',
    midnight: 'gray600',
    description: 'The page behind cards and tables.',
  },
  background: {
    light: 'white',
    dark: 'navy800',
    midnight: 'gray800',
    description: 'Tables, cards, inputs and other content surfaces.',
  },
  backgroundRaised: {
    light: 'white',
    dark: 'navy800',
    midnight: 'gray700',
    description: 'Menus, tooltips, modals and buttons.',
  },
  backgroundHover: {
    light: 'navy50',
    dark: 'navy700',
    midnight: 'gray500',
    description: 'A hovered row on a content surface.',
  },
  backgroundSelected: {
    all: { ref: 'accentSubtle' },
    description: 'A selected row on a content surface.',
  },
  border: {
    light: 'navy100',
    dark: 'navy600',
    midnight: 'gray600',
    description: 'Lines between rows and around inputs, menus and tooltips.',
  },
  borderStrong: {
    light: 'navy300',
    dark: 'navy400',
    midnight: 'gray400',
    description: 'Stronger lines, such as button outlines and dividers.',
  },
  text: {
    light: { raw: '#272630' },
    dark: 'navy150',
    midnight: 'gray100',
    description: 'Primary text.',
  },
  textSecondary: {
    light: 'navy500',
    dark: 'navy300',
    midnight: 'gray200',
    description: 'Supporting text such as descriptions and labels.',
  },
  textTertiary: {
    light: 'navy300',
    dark: 'navy400',
    midnight: 'gray300',
    description: 'The least prominent text, such as hints.',
  },
  success: {
    light: 'green500',
    dark: 'green400',
    midnight: 'green400',
    description:
      'Success and notice messages. Their fills and text are worked out from it.',
  },
  warning: {
    light: 'orange500',
    dark: 'orange300',
    midnight: 'orange300',
    description:
      'Warning messages. Their fills and text are worked out from it.',
  },
  error: {
    light: 'red500',
    dark: 'red500',
    midnight: 'red500',
    description: 'Error messages. Their fills and text are worked out from it.',
  },

  pageBackground: { all: { ref: 'backgroundPage' } },
  pageBackgroundTopLeft: {
    light: 'navy100',
    dark: 'navy800',
    midnight: 'gray800',
  },
  pageBackgroundBottomRight: {
    light: 'blue150',
    dark: 'gray700',
    midnight: 'gray700',
  },
  pageBackgroundLineTop: {
    light: 'white',
    dark: 'purple400',
    midnight: 'purple300',
  },
  pageBackgroundLineMid: {
    light: 'navy100',
    dark: 'navy900',
    midnight: 'gray900',
  },
  pageBackgroundLineBottom: {
    light: 'blue150',
    dark: 'navy150',
    midnight: 'gray150',
  },
  pageText: { all: { ref: 'text' } },
  pageTextLight: { all: { ref: 'textSecondary' } },
  pageTextSubdued: { all: { ref: 'textTertiary' } },
  pageTextDark: { all: { ref: 'text' } },
  pageTextPositive: { all: { ref: 'accentText' } },
  pageTextLink: { all: { ref: 'accentText' } },
  pageTextLinkLight: { all: { ref: 'accentText' } },

  cardBackground: { all: { ref: 'background' } },
  cardBorder: { all: { ref: 'accentBorder' } },
  cardShadow: { light: 'navy700', dark: 'navy700', midnight: 'gray900' },

  tableBackground: { all: { ref: 'background' } },
  tableRowBackgroundAlternate: {
    all: { ref: 'tableBackground' },
    fallback: 'tableBackground',
  },
  tableRowBackgroundHover: { all: { ref: 'backgroundHover' } },
  tableText: { all: { ref: 'text' } },
  tableTextItemAdded: { all: { ref: 'tableText' } },
  tableTextLight: {
    light: 'navy500',
    dark: { ref: 'tableText' },
    midnight: { ref: 'tableText' },
  },
  tableTextSubdued: { all: { ref: 'textSecondary' } },
  tableTextSelected: { all: { ref: 'tableText' } },
  tableTextInactive: { light: 'navy500', dark: 'navy400', midnight: 'gray300' },
  tableHeaderText: { light: 'navy600', dark: 'navy200', midnight: 'gray200' },
  tableHeaderBackground: {
    light: 'white',
    dark: 'navy700',
    midnight: 'gray900',
  },
  tableBorder: { all: { ref: 'border' } },
  tableBorderSelected: { all: { ref: 'accentBorder' } },
  tableBorderHover: { all: { ref: 'accentBorder' } },
  tableBorderSeparator: { all: { ref: 'borderStrong' } },
  tableRowBackgroundHighlight: { all: { ref: 'backgroundSelected' } },
  tableRowBackgroundHighlightText: { all: { ref: 'tableText' } },
  tableRowHeaderBackground: {
    light: 'navy50',
    dark: 'navy700',
    midnight: 'gray700',
  },
  tableRowHeaderText: { all: { ref: 'text' } },

  numberPositive: { light: 'green700', dark: 'green300', midnight: 'green300' },
  numberNegative: { light: 'red500', dark: 'red200', midnight: 'red200' },
  numberNeutral: { all: { ref: 'textSecondary' } },
  budgetNumberNegative: { all: { ref: 'numberNegative' } },
  budgetNumberZero: { all: { ref: 'tableTextSubdued' } },
  budgetNumberNeutral: { all: { ref: 'tableText' } },
  budgetNumberPositive: { all: { ref: 'budgetNumberNeutral' } },
  templateNumberFunded: { all: { ref: 'numberPositive' } },
  templateNumberUnderFunded: {
    light: 'orange700',
    dark: 'orange300',
    midnight: 'orange200',
  },
  toBudgetPositive: { all: { ref: 'numberPositive' } },
  toBudgetZero: { all: { ref: 'numberPositive' } },
  toBudgetNegative: { all: { ref: 'budgetNumberNegative' } },

  sidebarBackground: { light: 'navy900', dark: 'navy900', midnight: 'gray900' },
  sidebarItemBackgroundPending: { all: 'orange200' },
  sidebarItemBackgroundPositive: {
    light: 'green500',
    dark: 'green500',
    midnight: 'green400',
  },
  sidebarItemBackgroundFailed: { all: 'red300' },
  sidebarItemBackgroundHover: {
    light: 'navy800',
    dark: 'navy700',
    midnight: 'gray700',
  },
  sidebarItemAccentSelected: {
    all: { accentTextOn: 'sidebarBackground', contrast: 7 },
  },
  sidebarItemBackgroundSelected: {
    all: {
      raw: 'color-mix(in srgb, var(--color-sidebarItemAccentSelected) 22%, transparent)',
    },
  },
  sidebarItemText: { light: 'navy150', dark: 'navy150', midnight: 'gray100' },
  sidebarItemTextUpdated: { all: { ref: 'sidebarItemText' } },
  sidebarItemTextSelected: { all: { ref: 'sidebarItemAccentSelected' } },
  sidebarBudgetName: { light: 'navy150', dark: 'navy300', midnight: 'gray300' },
  sidebarHeaderText: { light: 'white', dark: 'white', midnight: 'gray100' },
  sidebarTextSubdued: {
    light: 'navy300',
    dark: 'navy300',
    midnight: 'gray300',
  },
  sidebarTextMuted: { light: 'navy500', dark: 'navy500', midnight: 'gray500' },
  sidebarTextPositive: { all: { ref: 'sidebarItemBackgroundPositive' } },
  sidebarTextFailed: { all: { ref: 'sidebarItemBackgroundFailed' } },
  sidebarBackgroundFailedSubtle: {
    all: {
      raw: 'color-mix(in srgb, var(--color-sidebarItemBackgroundFailed) 16%, transparent)',
    },
  },
  sidebarBorder: { all: { ref: 'sidebarItemBackgroundHover' } },
  sidebarControlBackground: { all: { ref: 'sidebarItemBackgroundHover' } },
  sidebarBrand: { all: { ref: 'sidebarItemAccentSelected' } },

  settingsCardBackground: { all: { ref: 'tableBackground' } },
  settingsCardBorder: { all: { ref: 'tableBorder' } },
  settingsCardText: { all: { ref: 'tableText' } },
  settingsCardTextSubdued: { all: { ref: 'textSecondary' } },
  settingsNavItemText: { all: { ref: 'pageText' } },
  settingsNavItemBackgroundHover: {
    all: {
      raw: 'color-mix(in srgb, var(--color-settingsNavItemText) 8%, transparent)',
    },
  },
  settingsNavItemAccentSelected: { all: { ref: 'accentSubtleText' } },
  settingsNavItemTextSelected: {
    all: { ref: 'settingsNavItemAccentSelected' },
  },
  settingsNavItemBackgroundSelected: { all: { ref: 'accentSubtle' } },

  menuBackground: { all: { ref: 'backgroundRaised' } },
  menuItemBackgroundHover: {
    light: 'navy100',
    dark: 'navy600',
    midnight: 'gray500',
  },
  menuItemText: { all: { ref: 'text' } },
  menuItemTextHover: { all: { ref: 'text' } },
  menuItemTextSelected: { all: { ref: 'accentText' } },
  menuItemTextHeader: { all: { accentTextOn: 'menuBackground' } },
  menuBorder: { all: { ref: 'border' } },
  menuKeybindingText: { all: { accentTextOn: 'menuBackground' } },
  menuAutoCompleteBackground: {
    light: 'navy900',
    dark: 'navy900',
    midnight: 'gray600',
  },
  menuAutoCompleteBackgroundHover: {
    light: 'navy600',
    dark: 'navy600',
    midnight: 'gray500',
  },
  menuAutoCompleteText: {
    light: 'white',
    dark: 'navy200',
    midnight: 'gray100',
  },
  menuAutoCompleteTextHover: {
    light: 'green150',
    dark: 'green150',
    midnight: 'green150',
  },
  menuAutoCompleteTextHeader: {
    all: { accentTextOn: 'menuAutoCompleteBackground', contrast: 7 },
  },
  menuAutoCompleteItemTextHover: {
    light: { ref: 'menuAutoCompleteText' },
    dark: 'navy50',
    midnight: 'gray50',
  },
  menuAutoCompleteItemText: {
    light: { ref: 'menuAutoCompleteText' },
    dark: { ref: 'menuItemText' },
    midnight: { ref: 'menuItemText' },
  },

  modalBackground: { all: { ref: 'backgroundRaised' } },
  modalBorder: { light: 'white', dark: 'navy600', midnight: 'gray200' },
  mobileHeaderBackground: { all: { ref: 'accent' } },
  mobileHeaderText: { all: { ref: 'accentContrast' } },
  mobileHeaderTextSubdued: {
    all: {
      raw: 'color-mix(in srgb, var(--color-mobileHeaderText) 75%, transparent)',
    },
  },
  mobileHeaderTextHover: { all: { raw: 'rgba(200, 200, 200, 0.15)' } },
  mobilePageBackground: {
    light: 'navy50',
    dark: 'navy700',
    midnight: 'gray900',
  },
  mobileNavBackground: { all: { ref: 'backgroundRaised' } },
  mobileNavItem: { all: { ref: 'text' } },
  mobileNavItemSelected: { all: { ref: 'accentText' } },
  mobileAccountText: { all: 'blue800' },
  mobileTransactionSelected: { all: { ref: 'accentBorder' } },

  mobileViewTheme: { all: { ref: 'mobileHeaderBackground' } },
  mobileConfigServerViewTheme: { all: { ref: 'accent' } },

  markdownNormal: {
    all: {
      raw: 'color-mix(in srgb, var(--color-accent) 30%, transparent)',
    },
  },
  markdownDark: { all: { ref: 'accentBorder' } },
  markdownLight: { all: { ref: 'accentSubtle' } },

  buttonMenuText: { light: 'navy100', dark: 'navy200', midnight: 'gray200' },
  buttonMenuTextHover: {
    light: 'navy50',
    dark: { ref: 'buttonMenuText' },
    midnight: { ref: 'buttonMenuText' },
  },
  buttonMenuBackground: {
    light: { raw: 'transparent' },
    dark: { raw: 'transparent' },
    midnight: 'gray700',
  },
  buttonMenuBackgroundHover: { all: { raw: 'rgba(200, 200, 200, 0.25)' } },
  buttonMenuBorder: { light: 'navy500', dark: 'navy500', midnight: 'gray500' },
  buttonMenuSelectedText: { all: 'green800' },
  buttonMenuSelectedTextHover: { all: 'orange800' },
  buttonMenuSelectedBackground: { all: 'orange200' },
  buttonMenuSelectedBackgroundHover: {
    light: 'orange300',
    dark: 'orange300',
    midnight: 'gray300',
  },
  buttonMenuSelectedBorder: { all: { ref: 'buttonMenuSelectedBackground' } },

  buttonPrimaryText: { all: { ref: 'accentContrast' } },
  buttonPrimaryTextHover: { all: { ref: 'buttonPrimaryText' } },
  buttonPrimaryBackground: { all: { ref: 'accent' } },
  buttonPrimaryBackgroundHover: { all: { ref: 'accentHover' } },
  buttonPrimaryBorder: { all: { ref: 'buttonPrimaryBackground' } },
  buttonPrimaryShadow: {
    light: { raw: 'rgba(0, 0, 0, 0.3)' },
    dark: { raw: 'rgba(0, 0, 0, 0.6)' },
    midnight: { raw: 'rgba(0, 0, 0, 0.6)' },
  },
  buttonPrimaryDisabledText: {
    light: 'white',
    dark: 'navy700',
    midnight: 'gray400',
  },
  buttonPrimaryDisabledBackground: {
    light: 'navy300',
    dark: 'navy400',
    midnight: 'gray700',
  },
  buttonPrimaryDisabledBorder: {
    all: { ref: 'buttonPrimaryDisabledBackground' },
  },

  buttonNormalText: { all: { ref: 'text' } },
  buttonNormalTextHover: { all: { ref: 'text' } },
  buttonNormalBackground: { all: { ref: 'backgroundRaised' } },
  buttonNormalBackgroundHover: { all: { ref: 'backgroundHover' } },
  buttonNormalBorder: { all: { ref: 'borderStrong' } },
  buttonNormalShadow: {
    light: { raw: 'rgba(0, 0, 0, 0.2)' },
    dark: { raw: 'rgba(0, 0, 0, 0.4)' },
    midnight: { raw: 'rgba(0, 0, 0, 0.4)' },
  },
  buttonNormalSelectedText: { all: { ref: 'accentContrast' } },
  buttonNormalSelectedBackground: { all: { ref: 'accent' } },
  buttonNormalDisabledText: {
    light: 'navy300',
    dark: 'navy500',
    midnight: 'gray400',
  },
  buttonNormalDisabledBackground: { all: { ref: 'backgroundRaised' } },
  buttonNormalDisabledBorder: {
    light: 'navy150',
    dark: 'navy500',
    midnight: 'gray500',
  },

  calendarText: { light: 'navy50', dark: 'navy50', midnight: 'gray50' },
  calendarBackground: {
    light: 'navy900',
    dark: 'navy900',
    midnight: 'gray700',
  },
  calendarItemText: { all: 'white' },
  calendarItemBackground: {
    light: 'navy800',
    dark: 'navy800',
    midnight: 'gray500',
  },
  calendarSelectedBackground: { all: { ref: 'accent' } },
  calendarSelectedText: {
    all: {
      contrastOn: 'calendarSelectedBackground',
      over: 'calendarBackground',
    },
  },
  datePickerRangeBackground: { all: { ref: 'accentSubtle' } },

  buttonBareText: { all: { ref: 'pageText' } },
  buttonBareTextHover: { all: { ref: 'pageText' } },
  buttonBareDisabledText: {
    light: { ref: 'pageTextSubdued' },
    dark: 'navy500',
    midnight: 'gray400',
  },
  buttonBareBackground: { all: { raw: 'transparent' } },
  buttonBareDisabledBackground: { all: { ref: 'buttonBareBackground' } },
  buttonBareBackgroundHover: {
    light: { raw: 'rgba(100, 100, 100, 0.15)' },
    dark: { raw: 'rgba(200, 200, 200, 0.3)' },
    midnight: { raw: 'rgba(200, 200, 200, 0.3)' },
  },
  buttonBareBackgroundActive: {
    light: { raw: 'rgba(100, 100, 100, 0.25)' },
    dark: { raw: 'rgba(200, 200, 200, 0.5)' },
    midnight: { raw: 'rgba(200, 200, 200, 0.5)' },
  },

  noticeBackground: { all: { statusOf: 'success', part: 'fill' } },
  noticeBackgroundLight: { all: { statusOf: 'success', part: 'fillSubtle' } },
  noticeText: { all: { statusOf: 'success', part: 'text' } },
  noticeTextLight: { all: { statusOf: 'success', part: 'textOnSubtle' } },
  noticeTextDark: { all: { statusOf: 'success', part: 'textStrong' } },
  noticeTextMenu: { light: 'green200', dark: 'green500', midnight: 'green400' },
  noticeBorder: { all: { ref: 'success' } },
  warningBackground: { all: { statusOf: 'warning', part: 'fill' } },
  warningText: { all: { statusOf: 'warning', part: 'text' } },
  warningTextDark: { all: { statusOf: 'warning', part: 'textStrong' } },
  warningBorder: { all: { ref: 'warning' } },
  errorBackground: { all: { statusOf: 'error', part: 'fill' } },
  errorText: { all: { statusOf: 'error', part: 'text' } },
  errorTextDark: { all: { statusOf: 'error', part: 'textStrong' } },
  errorTextDarker: {
    light: 'red900',
    dark: { ref: 'errorTextDark' },
    midnight: { ref: 'errorTextDark' },
  },
  errorTextMenu: { all: 'red200' },
  errorBorder: { all: { ref: 'error' } },
  upcomingBackground: { all: { ref: 'accentSubtle' } },
  upcomingText: { all: { ref: 'accentSubtleText' } },

  formLabelText: { all: { ref: 'accentText' } },
  formLabelBackground: { all: { ref: 'tableBackground' } },
  formInputBackground: { all: { ref: 'background' } },
  formInputBackgroundSelected: {
    light: 'white',
    dark: 'navy700',
    midnight: 'gray700',
  },
  formInputBackgroundSelection: { all: { ref: 'accent' } },
  formInputBorder: { all: { ref: 'border' } },
  formInputTextReadOnlySelection: {
    light: 'navy50',
    dark: 'navy800',
    midnight: 'gray800',
  },
  formInputBorderSelected: { all: { ref: 'accentBorder' } },
  formInputText: { all: { ref: 'text' } },
  formInputTextPlaceholder: { all: { ref: 'textTertiary' } },
  formInputTextPlaceholderSelected: {
    light: 'navy200',
    dark: 'navy100',
    midnight: 'gray100',
  },
  formInputShadowSelected: { all: { ref: 'accentBorder' } },
  formInputTextHighlight: { all: { ref: 'accentText' } },
  checkboxText: { all: { ref: 'accentContrast' } },
  checkboxBackgroundSelected: { all: { ref: 'accent' } },
  checkboxBorderSelected: { all: { ref: 'accent' } },
  checkboxShadowSelected: { all: { ref: 'accentBorder' } },
  checkboxToggleBackground: {
    light: 'gray400',
    dark: 'gray700',
    midnight: 'gray400',
  },
  checkboxToggleBackgroundSelected: { all: { ref: 'accent' } },
  checkboxToggleDisabled: {
    light: 'gray200',
    dark: 'gray400',
    midnight: 'gray700',
  },

  pillBackground: { light: 'navy150', dark: 'navy800', midnight: 'gray500' },
  pillBackgroundLight: {
    light: 'navy50',
    dark: 'navy900',
    midnight: 'gray900',
  },
  pillText: { all: { ref: 'text' } },
  pillTextHighlighted: {
    all: { accentTextOn: 'pillBackgroundLight', contrast: 7 },
  },
  pillBorder: { light: 'navy150', dark: 'navy700', midnight: 'gray500' },
  pillBorderDark: { all: { ref: 'borderStrong' } },
  pillBackgroundSelected: { all: { ref: 'accentSubtle' } },
  pillTextSelected: { all: { ref: 'accentSubtleText' } },
  pillBorderSelected: { all: { ref: 'accentBorder' } },

  reportsRed: { all: 'red300' },
  reportsBlue: { all: 'blue400' },
  reportsGreen: { all: 'green400' },
  reportsGray: { all: 'gray400' },
  reportsLabel: { all: { ref: 'text' } },
  reportsInnerLabel: { all: 'navy800' },
  reportsNumberPositive: { all: { ref: 'numberPositive' } },
  reportsNumberNegative: { all: { ref: 'numberNegative' } },
  reportsNumberNeutral: { all: { ref: 'numberNeutral' } },
  reportsChartFill: { all: { ref: 'reportsNumberPositive' } },

  noteTagBackground: { all: { ref: 'accentSubtle' } },
  noteTagBackgroundHover: {
    all: {
      raw: 'color-mix(in srgb, var(--color-accentSubtle) 50%, var(--color-tableBackground))',
    },
  },
  noteTagText: { all: { ref: 'accentSubtleText' } },

  budgetCurrentMonth: { all: { ref: 'tableBackground' } },
  budgetOtherMonth: { light: 'gray50', dark: 'navy900', midnight: 'gray700' },
  budgetHeaderCurrentMonth: {
    light: { ref: 'budgetOtherMonth' },
    dark: { ref: 'tableHeaderBackground' },
    midnight: { ref: 'tableHeaderBackground' },
  },
  budgetHeaderOtherMonth: {
    light: 'gray80',
    dark: 'navy800',
    midnight: 'gray800',
  },

  floatingActionBarBackground: { all: { ref: 'accent' } },
  floatingActionBarBorder: {
    all: { ref: 'floatingActionBarBackground' },
  },
  floatingActionBarText: { all: { ref: 'accentContrast' } },

  tooltipText: { all: { ref: 'text' } },
  tooltipBackground: { all: { ref: 'backgroundRaised' } },
  tooltipBorder: { all: { ref: 'border' } },

  calendarCellBackground: {
    light: 'navy100',
    dark: 'navy900',
    midnight: 'navy900',
  },

  overlayBackground: { all: { raw: 'rgba(0, 0, 0, 0.3)' } },

  chartQual1: { all: 'chartQual1' },
  chartQual2: { all: 'chartQual2' },
  chartQual3: { all: 'chartQual3' },
  chartQual4: { all: 'chartQual4' },
  chartQual5: { all: 'chartQual5' },
  chartQual6: { all: 'chartQual6' },
  chartQual7: { all: 'chartQual7' },
  chartQual8: { all: 'chartQual8' },
  chartQual9: { all: 'chartQual9' },
} satisfies Record<string, TokenDefinition>;
