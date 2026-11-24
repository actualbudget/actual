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

  pageBackground: { light: 'navy100', dark: 'gray900', midnight: 'gray600' },
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
  pageText: { light: { raw: '#272630' }, dark: 'navy150', midnight: 'gray100' },
  pageTextLight: { light: 'navy500', dark: 'navy300', midnight: 'gray200' },
  pageTextSubdued: { light: 'navy300', dark: 'navy500', midnight: 'gray400' },
  pageTextDark: { light: 'navy800', dark: 'navy100', midnight: 'gray100' },
  pageTextPositive: { all: { ref: 'accentText' } },
  pageTextLink: { all: { ref: 'accentText' } },
  pageTextLinkLight: { all: { ref: 'accentText' } },

  cardBackground: { light: 'white', dark: 'gray800', midnight: 'gray800' },
  cardBorder: { all: { ref: 'accentBorder' } },
  cardShadow: { light: 'navy700', dark: 'navy700', midnight: 'gray900' },

  tableBackground: { light: 'white', dark: 'navy800', midnight: 'gray800' },
  tableRowBackgroundAlternate: {
    all: { ref: 'tableBackground' },
    fallback: 'tableBackground',
  },
  tableRowBackgroundHover: {
    light: 'navy50',
    dark: 'navy700',
    midnight: 'gray500',
  },
  tableText: {
    light: { ref: 'pageText' },
    dark: 'navy150',
    midnight: 'gray150',
  },
  tableTextItemAdded: { all: { ref: 'tableText' } },
  tableTextLight: {
    light: 'navy400',
    dark: { ref: 'tableText' },
    midnight: { ref: 'tableText' },
  },
  tableTextSubdued: { light: 'navy500', dark: 'navy300', midnight: 'gray300' },
  tableTextSelected: { all: { ref: 'tableText' } },
  tableTextInactive: { light: 'navy500', dark: 'navy500', midnight: 'gray400' },
  tableHeaderText: { light: 'navy600', dark: 'navy300', midnight: 'gray200' },
  tableHeaderBackground: {
    light: 'white',
    dark: 'navy700',
    midnight: 'gray900',
  },
  tableBorder: { light: 'navy100', dark: 'navy600', midnight: 'gray600' },
  tableBorderSelected: { all: { ref: 'accentBorder' } },
  tableBorderHover: { all: { ref: 'accentBorder' } },
  tableBorderSeparator: {
    light: 'navy400',
    dark: 'navy400',
    midnight: 'gray400',
  },
  tableRowBackgroundHighlight: { all: { ref: 'accentSubtle' } },
  tableRowBackgroundHighlightText: { all: { ref: 'tableText' } },
  tableRowHeaderBackground: {
    light: 'navy50',
    dark: 'navy700',
    midnight: 'gray700',
  },
  tableRowHeaderText: {
    light: 'navy800',
    dark: 'navy150',
    midnight: 'gray150',
  },

  numberPositive: { light: 'green700', dark: 'green300', midnight: 'green300' },
  numberNegative: { light: 'red500', dark: 'red200', midnight: 'red200' },
  numberNeutral: { light: 'navy500', dark: 'navy300', midnight: 'gray300' },
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
  settingsCardTextSubdued: {
    light: 'navy600',
    dark: 'navy300',
    midnight: 'gray200',
  },
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

  menuBackground: { light: 'white', dark: 'navy800', midnight: 'gray700' },
  menuItemBackgroundHover: {
    light: 'navy100',
    dark: 'navy500',
    midnight: 'gray500',
  },
  menuItemText: { light: 'navy900', dark: 'navy100', midnight: 'gray100' },
  menuItemTextHover: {
    light: { ref: 'menuItemText' },
    dark: 'navy50',
    midnight: 'gray50',
  },
  menuItemTextSelected: { all: { ref: 'accentText' } },
  menuItemTextHeader: { all: { accentTextOn: 'menuBackground' } },
  menuBorder: { light: 'navy100', dark: 'navy900', midnight: 'gray800' },
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
    midnight: 'green400',
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

  modalBackground: { light: 'white', dark: 'gray800', midnight: 'gray700' },
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
  mobileNavBackground: { light: 'white', dark: 'navy800', midnight: 'gray600' },
  mobileNavItem: { light: 'gray300', dark: 'navy150', midnight: 'gray150' },
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

  buttonNormalText: { light: 'navy900', dark: 'navy150', midnight: 'gray150' },
  buttonNormalTextHover: {
    light: { ref: 'buttonNormalText' },
    dark: 'navy150',
    midnight: 'gray150',
  },
  buttonNormalBackground: {
    light: 'white',
    dark: 'navy800',
    midnight: 'gray600',
  },
  buttonNormalBackgroundHover: {
    light: { ref: 'buttonNormalBackground' },
    dark: 'navy600',
    midnight: 'gray400',
  },
  buttonNormalBorder: {
    light: 'navy150',
    dark: 'navy300',
    midnight: 'gray300',
  },
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
  buttonNormalDisabledBackground: {
    light: { ref: 'buttonNormalBackground' },
    dark: 'navy800',
    midnight: 'gray700',
  },
  buttonNormalDisabledBorder: {
    light: { ref: 'buttonNormalBorder' },
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
  buttonBareDisabledText: { all: { ref: 'pageTextSubdued' } },
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

  noticeBackground: {
    light: 'green150',
    dark: 'green800',
    midnight: 'green600',
  },
  noticeBackgroundLight: {
    light: 'green100',
    dark: 'green900',
    midnight: 'green900',
  },
  noticeText: { light: 'green700', dark: 'green300', midnight: 'green300' },
  noticeTextLight: {
    light: 'green500',
    dark: 'green500',
    midnight: 'green400',
  },
  noticeTextDark: { light: 'green900', dark: 'green150', midnight: 'green150' },
  noticeTextMenu: { light: 'green200', dark: 'green500', midnight: 'green400' },
  noticeBorder: { light: 'green500', dark: 'green800', midnight: 'green800' },
  warningBackground: {
    light: 'orange200',
    dark: 'orange800',
    midnight: 'orange800',
  },
  warningText: { light: 'orange700', dark: 'orange300', midnight: 'orange200' },
  warningTextDark: {
    light: 'orange900',
    dark: 'orange100',
    midnight: 'orange100',
  },
  warningBorder: { all: 'orange500' },
  errorBackground: { light: 'red100', dark: 'red800', midnight: 'red800' },
  errorText: { light: 'red500', dark: 'red200', midnight: 'red200' },
  errorTextDark: { light: 'red700', dark: 'red150', midnight: 'red150' },
  errorTextDarker: {
    light: 'red900',
    dark: { ref: 'errorTextDark' },
    midnight: { ref: 'errorTextDark' },
  },
  errorTextMenu: { all: 'red200' },
  errorBorder: { all: 'red500' },
  upcomingBackground: { all: { ref: 'accentSubtle' } },
  upcomingText: { all: { ref: 'accentSubtleText' } },

  formLabelText: { all: { ref: 'accentText' } },
  formLabelBackground: { all: { ref: 'tableBackground' } },
  formInputBackground: {
    light: 'navy50',
    dark: 'navy800',
    midnight: 'gray800',
  },
  formInputBackgroundSelected: {
    light: 'white',
    dark: 'navy700',
    midnight: 'gray700',
  },
  formInputBackgroundSelection: { all: { ref: 'accent' } },
  formInputBorder: { light: 'navy150', dark: 'navy600', midnight: 'gray600' },
  formInputTextReadOnlySelection: {
    light: 'navy50',
    dark: 'navy800',
    midnight: 'gray800',
  },
  formInputBorderSelected: { all: { ref: 'accentBorder' } },
  formInputText: { light: 'navy900', dark: 'navy150', midnight: 'gray150' },
  formInputTextPlaceholder: {
    light: 'navy300',
    dark: 'navy150',
    midnight: 'gray150',
  },
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
  pillText: { light: 'navy800', dark: 'navy200', midnight: 'gray200' },
  pillTextHighlighted: {
    all: { accentTextOn: 'pillBackgroundLight', contrast: 7 },
  },
  pillBorder: { light: 'navy150', dark: 'navy700', midnight: 'gray500' },
  pillBorderDark: {
    light: 'navy300',
    dark: { ref: 'pillBorder' },
    midnight: { ref: 'pillBorder' },
  },
  pillBackgroundSelected: { all: { ref: 'accentSubtle' } },
  pillTextSelected: { all: { ref: 'accentSubtleText' } },
  pillBorderSelected: { all: { ref: 'accentBorder' } },

  reportsRed: { all: 'red300' },
  reportsBlue: { all: 'blue400' },
  reportsGreen: { all: 'green400' },
  reportsGray: { all: 'gray400' },
  reportsLabel: {
    light: 'navy900',
    dark: { ref: 'pageText' },
    midnight: { ref: 'pageText' },
  },
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

  tooltipText: { light: 'navy900', dark: 'navy100', midnight: 'gray100' },
  tooltipBackground: { light: 'white', dark: 'navy800', midnight: 'gray800' },
  tooltipBorder: { light: 'navy150', dark: 'navy700', midnight: 'gray600' },

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
