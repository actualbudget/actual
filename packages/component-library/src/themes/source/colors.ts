import type { TokenDefinition } from './types';

export const colors = {
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
  pageTextPositive: {
    light: 'purple600',
    dark: 'purple200',
    midnight: 'purple200',
  },
  pageTextLink: { light: 'blue600', dark: 'purple400', midnight: 'purple300' },
  pageTextLinkLight: {
    light: 'blue300',
    dark: 'purple200',
    midnight: 'purple300',
  },

  cardBackground: { light: 'white', dark: 'gray800', midnight: 'gray800' },
  cardBorder: { light: 'purple700', dark: 'purple400', midnight: 'purple300' },
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
  tableTextSelected: { light: 'navy700', dark: 'navy150', midnight: 'gray800' },
  tableTextInactive: { light: 'navy500', dark: 'navy500', midnight: 'gray400' },
  tableHeaderText: { light: 'navy600', dark: 'navy300', midnight: 'gray200' },
  tableHeaderBackground: {
    light: 'white',
    dark: 'navy700',
    midnight: 'gray900',
  },
  tableBorder: { light: 'navy100', dark: 'navy600', midnight: 'gray600' },
  tableBorderSelected: {
    light: 'purple500',
    dark: 'purple400',
    midnight: 'purple400',
  },
  tableBorderHover: {
    light: 'purple400',
    dark: 'purple300',
    midnight: 'purple300',
  },
  tableBorderSeparator: {
    light: 'navy400',
    dark: 'navy400',
    midnight: 'gray400',
  },
  tableRowBackgroundHighlight: {
    light: 'blue150',
    dark: 'purple800',
    midnight: 'purple150',
  },
  tableRowBackgroundHighlightText: {
    light: 'navy700',
    dark: 'navy150',
    midnight: 'gray800',
  },
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
  sidebarItemAccentSelected: { all: 'purple200' },
  sidebarItemBackgroundSelected: {
    light: {
      raw: 'color-mix(in srgb, var(--color-sidebarItemAccentSelected) 22%, transparent)',
    },
    dark: {
      raw: 'color-mix(in srgb, var(--color-sidebarItemAccentSelected) 22%, transparent)',
    },
    midnight: {
      raw: 'color-mix(in srgb, var(--color-sidebarItemAccentSelected) 35%, transparent)',
    },
  },
  sidebarItemText: { light: 'navy150', dark: 'navy150', midnight: 'gray100' },
  sidebarItemTextUpdated: { all: { ref: 'sidebarItemText' } },
  sidebarItemTextSelected: { all: 'purple200' },
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
  settingsNavItemAccentSelected: {
    light: 'purple500',
    dark: 'purple200',
    midnight: 'purple200',
  },
  settingsNavItemTextSelected: {
    light: 'purple600',
    dark: { ref: 'settingsNavItemAccentSelected' },
    midnight: { ref: 'settingsNavItemAccentSelected' },
  },
  settingsNavItemBackgroundSelected: {
    light: {
      raw: 'color-mix(in srgb, var(--color-settingsNavItemAccentSelected) 10%, transparent)',
    },
    dark: {
      raw: 'color-mix(in srgb, var(--color-settingsNavItemAccentSelected) 22%, transparent)',
    },
    midnight: {
      raw: 'color-mix(in srgb, var(--color-settingsNavItemAccentSelected) 22%, transparent)',
    },
  },

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
  menuItemTextSelected: {
    light: 'purple300',
    dark: 'purple400',
    midnight: 'purple400',
  },
  menuItemTextHeader: {
    light: 'navy400',
    dark: 'purple200',
    midnight: 'purple200',
  },
  menuBorder: { light: 'navy100', dark: 'navy900', midnight: 'gray800' },
  menuKeybindingText: {
    light: 'navy400',
    dark: 'purple200',
    midnight: 'purple200',
  },
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
    light: 'orange150',
    dark: 'purple200',
    midnight: 'purple200',
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
  mobileHeaderBackground: {
    light: 'purple400',
    dark: 'purple800',
    midnight: 'gray900',
  },
  mobileHeaderText: { light: 'navy50', dark: 'navy150', midnight: 'purple200' },
  mobileHeaderTextSubdued: { all: 'gray200' },
  mobileHeaderTextHover: { all: { raw: 'rgba(200, 200, 200, 0.15)' } },
  mobilePageBackground: {
    light: 'navy50',
    dark: 'navy700',
    midnight: 'gray900',
  },
  mobileNavBackground: { light: 'white', dark: 'navy800', midnight: 'gray600' },
  mobileNavItem: { light: 'gray300', dark: 'navy150', midnight: 'gray150' },
  mobileNavItemSelected: {
    light: 'purple500',
    dark: 'purple400',
    midnight: 'purple200',
  },
  mobileAccountText: { all: 'blue800' },
  mobileTransactionSelected: {
    light: 'purple500',
    dark: 'purple400',
    midnight: 'purple300',
  },

  mobileViewTheme: { all: { ref: 'mobileHeaderBackground' } },
  mobileConfigServerViewTheme: { all: 'purple500' },

  markdownNormal: {
    light: 'purple150',
    dark: 'purple700',
    midnight: 'purple700',
  },
  markdownDark: {
    light: 'purple400',
    dark: 'purple500',
    midnight: 'purple500',
  },
  markdownLight: {
    light: 'purple100',
    dark: 'purple800',
    midnight: 'purple800',
  },

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

  buttonPrimaryText: { all: 'white' },
  buttonPrimaryTextHover: { all: { ref: 'buttonPrimaryText' } },
  buttonPrimaryBackground: {
    light: 'purple500',
    dark: 'purple400',
    midnight: 'purple300',
  },
  buttonPrimaryBackgroundHover: {
    light: 'purple300',
    dark: 'purple600',
    midnight: { ref: 'buttonPrimaryBackground' },
  },
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
  buttonNormalSelectedText: { all: 'white' },
  buttonNormalSelectedBackground: {
    light: 'blue600',
    dark: 'purple600',
    midnight: 'purple500',
  },
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
  calendarItemText: { light: 'navy150', dark: 'navy150', midnight: 'gray150' },
  calendarItemBackground: {
    light: 'navy800',
    dark: 'navy800',
    midnight: 'gray500',
  },
  calendarSelectedBackground: {
    light: 'navy500',
    dark: { ref: 'buttonNormalSelectedBackground' },
    midnight: { ref: 'buttonNormalSelectedBackground' },
  },
  datePickerRangeBackground: {
    light: 'purple150',
    dark: 'purple600',
    midnight: 'purple600',
  },

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
  upcomingBackground: {
    light: 'purple100',
    dark: 'purple700',
    midnight: 'purple800',
  },
  upcomingText: {
    light: 'purple700',
    dark: 'purple100',
    midnight: 'purple200',
  },

  formLabelText: { light: 'blue600', dark: 'purple150', midnight: 'purple150' },
  formLabelBackground: {
    light: 'blue200',
    dark: 'blue900',
    midnight: 'blue900',
  },
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
  formInputBackgroundSelection: {
    light: 'purple500',
    dark: 'purple400',
    midnight: 'purple400',
  },
  formInputBorder: { light: 'navy150', dark: 'navy600', midnight: 'gray600' },
  formInputTextReadOnlySelection: {
    light: 'navy50',
    dark: 'navy800',
    midnight: 'gray800',
  },
  formInputBorderSelected: {
    light: 'purple500',
    dark: 'purple400',
    midnight: 'purple300',
  },
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
  formInputShadowSelected: {
    light: 'purple300',
    dark: 'purple200',
    midnight: 'purple400',
  },
  formInputTextHighlight: {
    light: 'purple200',
    dark: 'purple400',
    midnight: 'purple200',
  },
  checkboxText: {
    light: { ref: 'tableBackground' },
    dark: { ref: 'tableText' },
    midnight: { ref: 'tableText' },
  },
  checkboxBackgroundSelected: {
    light: 'blue500',
    dark: 'purple300',
    midnight: 'purple300',
  },
  checkboxBorderSelected: {
    light: 'blue500',
    dark: 'purple300',
    midnight: 'purple300',
  },
  checkboxShadowSelected: {
    light: 'blue300',
    dark: 'purple500',
    midnight: 'purple500',
  },
  checkboxToggleBackground: {
    light: 'gray400',
    dark: 'gray700',
    midnight: 'gray400',
  },
  checkboxToggleBackgroundSelected: {
    light: 'purple600',
    dark: 'purple300',
    midnight: 'purple300',
  },
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
    light: 'purple600',
    dark: 'purple200',
    midnight: 'purple200',
  },
  pillBorder: { light: 'navy150', dark: 'navy700', midnight: 'gray500' },
  pillBorderDark: {
    light: 'navy300',
    dark: { ref: 'pillBorder' },
    midnight: { ref: 'pillBorder' },
  },
  pillBackgroundSelected: {
    light: 'blue150',
    dark: 'purple600',
    midnight: 'purple600',
  },
  pillTextSelected: { light: 'blue900', dark: 'navy150', midnight: 'gray150' },
  pillBorderSelected: {
    light: 'purple500',
    dark: 'purple400',
    midnight: 'purple300',
  },

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

  noteTagBackground: {
    light: 'purple125',
    dark: 'purple700',
    midnight: 'purple800',
  },
  noteTagBackgroundHover: {
    light: 'purple150',
    dark: 'purple500',
    midnight: 'purple600',
  },
  noteTagText: { light: 'black', dark: 'purple100', midnight: 'purple100' },

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

  floatingActionBarBackground: {
    light: 'purple400',
    dark: 'purple800',
    midnight: 'gray900',
  },
  floatingActionBarBorder: {
    light: { ref: 'floatingActionBarBackground' },
    dark: { ref: 'floatingActionBarBackground' },
    midnight: 'purple300',
  },
  floatingActionBarText: {
    light: 'navy50',
    dark: 'navy150',
    midnight: 'purple200',
  },

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
