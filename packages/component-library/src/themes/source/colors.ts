import type { TokenDefinition } from './types';

export const colors = {
  pageBackground: { light: 'stone80', dark: 'gray900', midnight: 'gray600' },
  pageBackgroundTopLeft: {
    light: 'stone80',
    dark: 'navy800',
    midnight: 'gray800',
  },
  pageBackgroundBottomRight: {
    light: 'brand100',
    dark: 'gray700',
    midnight: 'gray700',
  },
  pageBackgroundLineTop: {
    light: 'white',
    dark: 'purple400',
    midnight: 'purple300',
  },
  pageBackgroundLineMid: {
    light: 'stone100',
    dark: 'navy900',
    midnight: 'gray900',
  },
  pageBackgroundLineBottom: {
    light: 'brand150',
    dark: 'navy150',
    midnight: 'gray150',
  },
  pageText: { light: 'stone900', dark: 'navy150', midnight: 'gray100' },
  pageTextLight: { light: 'stone600', dark: 'navy300', midnight: 'gray200' },
  pageTextSubdued: { light: 'stone600', dark: 'navy500', midnight: 'gray400' },
  pageTextDark: { light: 'stone800', dark: 'navy100', midnight: 'gray100' },
  pageTextPositive: {
    light: 'brand700',
    dark: 'brand300',
    midnight: 'brand300',
  },
  pageTextLink: { light: 'blue600', dark: 'purple400', midnight: 'purple300' },
  pageTextLinkLight: {
    light: 'blue300',
    dark: 'purple200',
    midnight: 'purple300',
  },

  cardBackground: { light: 'white', dark: 'gray800', midnight: 'gray800' },
  cardBorder: { light: 'stone150', dark: 'gray600', midnight: 'gray700' },
  cardShadow: {
    light: { raw: 'rgba(28, 27, 25, 0.06)' },
    dark: { raw: 'rgba(0, 0, 0, 0.35)' },
    midnight: { raw: 'rgba(0, 0, 0, 0.45)' },
  },

  tableBackground: { light: 'white', dark: 'navy800', midnight: 'gray800' },
  tableRowBackgroundAlternate: {
    all: { ref: 'tableBackground' },
    fallback: 'tableBackground',
  },
  tableRowBackgroundHover: {
    light: 'stone50',
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
    light: 'stone600',
    dark: { ref: 'tableText' },
    midnight: { ref: 'tableText' },
  },
  tableTextSubdued: { light: 'stone600', dark: 'navy500', midnight: 'gray500' },
  tableTextSelected: {
    light: 'stone800',
    dark: 'navy150',
    midnight: 'gray800',
  },
  tableTextInactive: {
    light: 'stone400',
    dark: 'navy500',
    midnight: 'gray400',
  },
  tableHeaderText: { light: 'stone600', dark: 'navy300', midnight: 'gray200' },
  tableHeaderBackground: {
    light: 'white',
    dark: 'navy700',
    midnight: 'gray900',
  },
  tableBorder: { light: 'stone150', dark: 'navy600', midnight: 'gray600' },
  tableBorderSelected: {
    light: 'brand500',
    dark: 'brand400',
    midnight: 'brand400',
  },
  tableBorderHover: {
    light: 'brand300',
    dark: 'brand300',
    midnight: 'brand300',
  },
  tableBorderSeparator: {
    light: 'stone300',
    dark: 'navy400',
    midnight: 'gray400',
  },
  tableRowBackgroundHighlight: {
    light: 'brand100',
    dark: 'purple800',
    midnight: 'purple150',
  },
  tableRowBackgroundHighlightText: {
    light: 'stone800',
    dark: 'navy150',
    midnight: 'gray800',
  },
  tableRowHeaderBackground: {
    light: 'stone50',
    dark: 'navy700',
    midnight: 'gray700',
  },
  tableRowHeaderText: {
    light: 'stone800',
    dark: 'navy150',
    midnight: 'gray150',
  },

  numberPositive: {
    light: 'moneyGreen700',
    dark: 'green300',
    midnight: 'green300',
  },
  numberNegative: { light: 'moneyRed700', dark: 'red200', midnight: 'red200' },
  numberNeutral: { light: 'stone600', dark: 'navy500', midnight: 'gray500' },
  budgetNumberNegative: { all: { ref: 'numberNegative' } },
  budgetNumberZero: { all: { ref: 'tableTextSubdued' } },
  budgetNumberNeutral: { all: { ref: 'tableText' } },
  budgetNumberPositive: { all: { ref: 'budgetNumberNeutral' } },
  templateNumberFunded: { all: { ref: 'numberPositive' } },
  templateNumberUnderFunded: {
    light: 'brand700',
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
    light: 'purple200',
    dark: 'brand400',
    midnight: 'brand400',
  },
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
  sidebarItemTextSelected: {
    light: 'purple200',
    dark: 'brand300',
    midnight: 'brand300',
  },
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
    light: 'stone600',
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
    light: 'brand500',
    dark: 'brand400',
    midnight: 'brand400',
  },
  settingsNavItemTextSelected: {
    light: 'brand700',
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
    light: 'stone100',
    dark: 'navy500',
    midnight: 'gray500',
  },
  menuItemText: { light: 'stone900', dark: 'navy100', midnight: 'gray100' },
  menuItemTextHover: {
    light: 'brand700',
    dark: 'navy50',
    midnight: 'gray50',
  },
  menuItemTextSelected: {
    light: 'brand600',
    dark: 'brand400',
    midnight: 'brand400',
  },
  menuItemTextHeader: {
    light: 'stone500',
    dark: 'purple200',
    midnight: 'purple200',
  },
  menuBorder: { light: 'stone150', dark: 'navy900', midnight: 'gray800' },
  menuKeybindingText: {
    light: 'stone600',
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
    light: 'brand500',
    dark: 'purple800',
    midnight: 'gray900',
  },
  mobileHeaderText: {
    light: 'stone900',
    dark: 'navy150',
    midnight: 'purple200',
  },
  mobileHeaderTextSubdued: {
    light: 'stone900',
    dark: 'gray200',
    midnight: 'gray200',
  },
  mobileHeaderTextHover: { all: { raw: 'rgba(200, 200, 200, 0.15)' } },
  mobilePageBackground: {
    light: 'stone80',
    dark: 'navy700',
    midnight: 'gray900',
  },
  mobileNavBackground: { light: 'white', dark: 'navy800', midnight: 'gray600' },
  mobileNavItem: { light: 'stone600', dark: 'navy150', midnight: 'gray150' },
  mobileNavItemSelected: {
    light: 'brand700',
    dark: 'brand400',
    midnight: 'brand400',
  },
  mobileAccountText: {
    light: 'stone900',
    dark: 'blue800',
    midnight: 'blue800',
  },
  mobileTransactionSelected: {
    light: 'brand700',
    dark: 'brand400',
    midnight: 'brand400',
  },

  mobileViewTheme: { all: { ref: 'mobileHeaderBackground' } },
  mobileConfigServerViewTheme: {
    light: 'brand500',
    dark: 'purple500',
    midnight: 'purple500',
  },

  markdownNormal: {
    light: 'brand150',
    dark: 'purple700',
    midnight: 'purple700',
  },
  markdownDark: { light: 'brand700', dark: 'purple500', midnight: 'purple500' },
  markdownLight: {
    light: 'brand100',
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

  buttonPrimaryText: { all: 'stone900' },
  buttonPrimaryTextHover: { all: { ref: 'buttonPrimaryText' } },
  buttonPrimaryBackground: {
    light: 'brand500',
    dark: 'brand500',
    midnight: 'brand500',
  },
  buttonPrimaryBackgroundHover: {
    light: 'brand600',
    dark: 'brand600',
    midnight: { ref: 'buttonPrimaryBackground' },
  },
  buttonPrimaryBorder: { all: { ref: 'buttonPrimaryBackground' } },
  buttonPrimaryShadow: {
    light: { raw: 'rgba(220, 95, 27, 0.25)' },
    dark: { raw: 'rgba(0, 0, 0, 0.6)' },
    midnight: { raw: 'rgba(0, 0, 0, 0.6)' },
  },
  buttonPrimaryDisabledText: {
    light: 'white',
    dark: 'navy700',
    midnight: 'gray400',
  },
  buttonPrimaryDisabledBackground: {
    light: 'stone300',
    dark: 'navy400',
    midnight: 'gray700',
  },
  buttonPrimaryDisabledBorder: {
    all: { ref: 'buttonPrimaryDisabledBackground' },
  },

  buttonNormalText: { light: 'stone800', dark: 'navy150', midnight: 'gray150' },
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
    light: 'stone50',
    dark: 'navy600',
    midnight: 'gray400',
  },
  buttonNormalBorder: {
    light: 'stone200',
    dark: 'navy300',
    midnight: 'gray300',
  },
  buttonNormalShadow: {
    light: { raw: 'rgba(28, 27, 25, 0.06)' },
    dark: { raw: 'rgba(0, 0, 0, 0.4)' },
    midnight: { raw: 'rgba(0, 0, 0, 0.4)' },
  },
  buttonNormalSelectedText: { all: 'white' },
  buttonNormalSelectedBackground: {
    light: 'brand500',
    dark: 'brand600',
    midnight: 'brand600',
  },
  buttonNormalDisabledText: {
    light: 'stone300',
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
    light: 'brand100',
    dark: 'purple600',
    midnight: 'purple600',
  },

  buttonBareText: { all: { ref: 'pageText' } },
  buttonBareTextHover: { all: { ref: 'pageText' } },
  buttonBareDisabledText: { all: { ref: 'pageTextSubdued' } },
  buttonBareBackground: { all: { raw: 'transparent' } },
  buttonBareDisabledBackground: { all: { ref: 'buttonBareBackground' } },
  buttonBareBackgroundHover: {
    light: { raw: 'rgba(68, 66, 62, 0.1)' },
    dark: { raw: 'rgba(200, 200, 200, 0.3)' },
    midnight: { raw: 'rgba(200, 200, 200, 0.3)' },
  },
  buttonBareBackgroundActive: {
    light: { raw: 'rgba(68, 66, 62, 0.18)' },
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
    light: 'blue100',
    dark: 'purple700',
    midnight: 'purple800',
  },
  upcomingText: { light: 'blue800', dark: 'purple100', midnight: 'purple200' },

  formLabelText: {
    light: 'stone600',
    dark: 'purple150',
    midnight: 'purple150',
  },
  formLabelBackground: {
    light: 'stone150',
    dark: 'blue900',
    midnight: 'blue900',
  },
  formInputBackground: { light: 'white', dark: 'navy800', midnight: 'gray800' },
  formInputBackgroundSelected: {
    light: 'white',
    dark: 'navy700',
    midnight: 'gray700',
  },
  formInputBackgroundSelection: {
    light: 'brand500',
    dark: 'brand500',
    midnight: 'brand500',
  },
  formInputBorder: { light: 'stone200', dark: 'navy600', midnight: 'gray600' },
  formInputTextReadOnlySelection: {
    light: 'stone100',
    dark: 'navy800',
    midnight: 'gray800',
  },
  formInputBorderSelected: {
    light: 'brand500',
    dark: 'brand400',
    midnight: 'brand400',
  },
  formInputText: { light: 'stone900', dark: 'navy150', midnight: 'gray150' },
  formInputTextPlaceholder: {
    light: 'stone600',
    dark: 'navy150',
    midnight: 'gray150',
  },
  formInputTextPlaceholderSelected: {
    light: 'stone600',
    dark: 'navy100',
    midnight: 'gray100',
  },
  formInputShadowSelected: {
    light: 'brand200',
    dark: 'purple200',
    midnight: 'purple400',
  },
  formInputTextHighlight: {
    light: 'brand200',
    dark: 'purple400',
    midnight: 'purple200',
  },
  checkboxText: {
    light: 'stone900',
    dark: { ref: 'tableText' },
    midnight: { ref: 'tableText' },
  },
  checkboxBackgroundSelected: {
    light: 'brand500',
    dark: 'brand400',
    midnight: 'brand400',
  },
  checkboxBorderSelected: {
    light: 'brand500',
    dark: 'brand400',
    midnight: 'brand400',
  },
  checkboxShadowSelected: {
    light: 'brand200',
    dark: 'purple500',
    midnight: 'purple500',
  },
  checkboxToggleBackground: {
    light: 'stone300',
    dark: 'gray700',
    midnight: 'gray400',
  },
  checkboxToggleBackgroundSelected: {
    light: 'brand500',
    dark: 'brand400',
    midnight: 'brand400',
  },
  checkboxToggleDisabled: {
    light: 'stone200',
    dark: 'gray400',
    midnight: 'gray700',
  },

  pillBackground: { light: 'stone150', dark: 'navy800', midnight: 'gray500' },
  pillBackgroundLight: {
    light: 'stone80',
    dark: 'navy900',
    midnight: 'gray900',
  },
  pillText: { light: 'stone800', dark: 'navy200', midnight: 'gray200' },
  pillTextHighlighted: {
    light: 'brand700',
    dark: 'brand300',
    midnight: 'purple200',
  },
  pillBorder: { light: 'stone200', dark: 'navy700', midnight: 'gray500' },
  pillBorderDark: {
    light: 'stone300',
    dark: { ref: 'pillBorder' },
    midnight: { ref: 'pillBorder' },
  },
  pillBackgroundSelected: {
    light: 'brand100',
    dark: 'purple600',
    midnight: 'purple600',
  },
  pillTextSelected: { light: 'brand800', dark: 'navy150', midnight: 'gray150' },
  pillBorderSelected: {
    light: 'brand500',
    dark: 'purple400',
    midnight: 'purple300',
  },

  reportsRed: { light: 'moneyRed500', dark: 'red300', midnight: 'red300' },
  reportsBlue: { all: 'blue400' },
  reportsGreen: {
    light: 'moneyGreen500',
    dark: 'green400',
    midnight: 'green400',
  },
  reportsGray: { light: 'stone400', dark: 'gray400', midnight: 'gray400' },
  reportsLabel: {
    light: 'stone900',
    dark: { ref: 'pageText' },
    midnight: { ref: 'pageText' },
  },
  reportsInnerLabel: {
    light: 'stone700',
    dark: 'navy800',
    midnight: 'navy800',
  },
  reportsNumberPositive: { all: { ref: 'numberPositive' } },
  reportsNumberNegative: { all: { ref: 'numberNegative' } },
  reportsNumberNeutral: { all: { ref: 'numberNeutral' } },
  reportsChartFill: { all: { ref: 'reportsNumberPositive' } },

  noteTagBackground: {
    light: 'brand100',
    dark: 'purple700',
    midnight: 'purple800',
  },
  noteTagBackgroundHover: {
    light: 'brand150',
    dark: 'purple500',
    midnight: 'purple600',
  },
  noteTagText: { light: 'black', dark: 'purple100', midnight: 'purple100' },

  budgetCurrentMonth: { all: { ref: 'tableBackground' } },
  budgetOtherMonth: { light: 'stone50', dark: 'navy900', midnight: 'gray700' },
  budgetHeaderCurrentMonth: {
    light: 'stone50',
    dark: { ref: 'tableHeaderBackground' },
    midnight: { ref: 'tableHeaderBackground' },
  },
  budgetHeaderOtherMonth: {
    light: 'stone100',
    dark: 'navy800',
    midnight: 'gray800',
  },

  floatingActionBarBackground: {
    light: 'stone800',
    dark: 'purple800',
    midnight: 'gray900',
  },
  floatingActionBarBorder: {
    light: { ref: 'floatingActionBarBackground' },
    dark: { ref: 'floatingActionBarBackground' },
    midnight: 'purple300',
  },
  floatingActionBarText: {
    light: 'white',
    dark: 'navy150',
    midnight: 'purple200',
  },

  tooltipText: { light: 'stone900', dark: 'navy100', midnight: 'gray100' },
  tooltipBackground: { light: 'white', dark: 'navy800', midnight: 'gray800' },
  tooltipBorder: { light: 'stone150', dark: 'navy700', midnight: 'gray600' },

  calendarCellBackground: {
    light: 'stone150',
    dark: 'navy900',
    midnight: 'navy900',
  },

  overlayBackground: {
    light: { raw: 'rgba(28, 27, 25, 0.35)' },
    dark: { raw: 'rgba(0, 0, 0, 0.3)' },
    midnight: { raw: 'rgba(0, 0, 0, 0.3)' },
  },

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
