import { useEffect, useState } from 'react';

import { isNonProductionEnvironment } from 'loot-core/src/shared/environment';
import type { DarkTheme, Theme } from 'loot-core/src/types/prefs';

import { useGlobalPref } from '../hooks/useGlobalPref';

import * as darkTheme from './themes/dark';
import * as developmentTheme from './themes/development';
import * as lightTheme from './themes/light';
import * as midnightTheme from './themes/midnight';

const themes = {
  light: { name: 'Light', colors: lightTheme },
  dark: { name: 'Dark', colors: darkTheme },
  midnight: { name: 'Midnight', colors: midnightTheme },
  auto: { name: 'System default', colors: darkTheme },
  ...(isNonProductionEnvironment() && {
    development: { name: 'Development', colors: developmentTheme },
  }),
};

export const themeOptions = Object.entries(themes).map(
  ([key, { name }]) => [key, name] as [Theme, string],
);

export const darkThemeOptions = Object.entries({
  dark: themes.dark,
  midnight: themes.midnight,
}).map(([key, { name }]) => [key, name] as [DarkTheme, string]);

export function useTheme() {
  const [theme = 'auto', setThemePref] = useGlobalPref('theme');
  return [theme, setThemePref] as const;
}

export function usePreferredDarkTheme() {
  const [darkTheme = 'dark', setDarkTheme] =
    useGlobalPref('preferredDarkTheme');
  return [darkTheme, setDarkTheme] as const;
}

export function ThemeStyle() {
  const [activeTheme] = useTheme();
  const [darkThemePreference] = usePreferredDarkTheme();
  const [themeColors, setThemeColors] = useState<
    | typeof lightTheme
    | typeof darkTheme
    | typeof midnightTheme
    | typeof developmentTheme
    | undefined
  >(undefined);

  useEffect(() => {
    if (activeTheme === 'auto') {
      const darkTheme = themes[darkThemePreference];

      function darkThemeMediaQueryListener(event: MediaQueryListEvent) {
        if (event.matches) {
          setThemeColors(darkTheme.colors);
        } else {
          setThemeColors(themes['light'].colors);
        }
      }
      const darkThemeMediaQuery = window.matchMedia(
        '(prefers-color-scheme: dark)',
      );

      darkThemeMediaQuery.addEventListener(
        'change',
        darkThemeMediaQueryListener,
      );

      if (darkThemeMediaQuery.matches) {
        setThemeColors(darkTheme.colors);
      } else {
        setThemeColors(themes['light'].colors);
      }

      return () => {
        darkThemeMediaQuery.removeEventListener(
          'change',
          darkThemeMediaQueryListener,
        );
      };
    } else {
      setThemeColors(themes[activeTheme]?.colors);
    }
  }, [activeTheme, darkThemePreference]);

  if (!themeColors) return null;

  const css = Object.entries(themeColors)
    .map(([key, value]) => `  --color-${key}: ${value};`)
    .join('\n');
  return <style>{`:root {\n${css}}`}</style>;
}

export const theme = {
  pageBackground: 'var(--color-pageBackground)',
  pageBackgroundModalActive: 'var(--color-pageBackgroundModalActive)',
  pageBackgroundTopLeft: 'var(--color-pageBackgroundTopLeft)',
  pageBackgroundBottomRight: 'var(--color-pageBackgroundBottomRight)',
  pageBackgroundLineTop: 'var(--color-pageBackgroundLineTop)',
  pageBackgroundLineMid: 'var(--color-pageBackgroundLineMid)',
  pageBackgroundLineBottom: 'var(--color-pageBackgroundLineBottom)',
  pageText: 'var(--color-pageText)',
  pageTextLight: 'var(--color-pageTextLight)',
  pageTextSubdued: 'var(--color-pageTextSubdued)',
  pageTextDark: 'var(--color-pageTextDark)',
  pageTextPositive: 'var(--color-pageTextPositive)',
  pageTextLink: 'var(--color-pageTextLink)',
  pageTextLinkLight: 'var(--color-pageTextLinkLight)',
  cardBackground: 'var(--color-cardBackground)',
  cardBorder: 'var(--color-cardBorder)',
  cardShadow: 'var(--color-cardShadow)',
  tableBackground: 'var(--color-tableBackground)',
  tableRowBackgroundHover: 'var(--color-tableRowBackgroundHover)',
  tableText: 'var(--color-tableText)',
  tableTextLight: 'var(--color-tableTextLight)',
  tableTextSubdued: 'var(--color-tableTextSubdued)',
  tableTextSelected: 'var(--color-tableTextSelected)',
  tableTextHover: 'var(--color-tableTextHover)',
  tableTextInactive: 'var(--color-tableTextInactive)',
  tableHeaderText: 'var(--color-tableHeaderText)',
  tableHeaderBackground: 'var(--color-tableHeaderBackground)',
  tableBorder: 'var(--color-tableBorder)',
  tableBorderSelected: 'var(--color-tableBorderSelected)',
  tableBorderHover: 'var(--color-tableBorderHover)',
  tableBorderSeparator: 'var(--color-tableBorderSeparator)',
  tableRowBackgroundHighlight: 'var(--color-tableRowBackgroundHighlight)',
  tableRowBackgroundHighlightText:
    'var(--color-tableRowBackgroundHighlightText)',
  tableRowHeaderBackground: 'var(--color-tableRowHeaderBackground)',
  tableRowHeaderText: 'var(--color-tableRowHeaderText)',
  sidebarBackground: 'var(--color-sidebarBackground)',
  sidebarItemBackgroundPending: 'var(--color-sidebarItemBackgroundPending)',
  sidebarItemBackgroundPositive: 'var(--color-sidebarItemBackgroundPositive)',
  sidebarItemBackgroundFailed: 'var(--color-sidebarItemBackgroundFailed)',
  sidebarItemAccentSelected: 'var(--color-sidebarItemAccentSelected)',
  sidebarItemBackgroundHover: 'var(--color-sidebarItemBackgroundHover)',
  sidebarItemText: 'var(--color-sidebarItemText)',
  sidebarItemTextSelected: 'var(--color-sidebarItemTextSelected)',
  menuBackground: 'var(--color-menuBackground)',
  menuItemBackground: 'var(--color-menuItemBackground)',
  menuItemBackgroundHover: 'var(--color-menuItemBackgroundHover)',
  menuItemText: 'var(--color-menuItemText)',
  menuItemTextHover: 'var(--color-menuItemTextHover)',
  menuItemTextSelected: 'var(--color-menuItemTextSelected)',
  menuItemTextHeader: 'var(--color-menuItemTextHeader)',
  menuBorder: 'var(--color-menuBorder)',
  menuBorderHover: 'var(--color-menuBorderHover)',
  menuKeybindingText: 'var(--color-menuKeybindingText)',
  menuAutoCompleteBackground: 'var(--color-menuAutoCompleteBackground)',
  menuAutoCompleteBackgroundHover:
    'var(--color-menuAutoCompleteBackgroundHover)',
  menuAutoCompleteText: 'var(--color-menuAutoCompleteText)',
  menuAutoCompleteTextHover: 'var(--color-menuAutoCompleteTextHover)',
  menuAutoCompleteTextHeader: 'var(--color-menuAutoCompleteTextHeader)',
  menuAutoCompleteItemTextHover: 'var(--color-menuAutoCompleteItemTextHover)',
  menuAutoCompleteItemText: 'var(--color-menuAutoCompleteItemText)',
  modalBackground: 'var(--color-modalBackground)',
  modalBorder: 'var(--color-modalBorder)',
  mobileHeaderBackground: 'var(--color-mobileHeaderBackground)',
  mobileHeaderText: 'var(--color-mobileHeaderText)',
  mobileHeaderTextSubdued: 'var(--color-mobileHeaderTextSubdued)',
  mobileHeaderTextHover: 'var(--color-mobileHeaderTextHover)',
  mobilePageBackground: 'var(--color-mobilePageBackground)',
  mobileNavBackground: 'var(--color-mobileNavBackground)',
  mobileNavItem: 'var(--color-mobileNavItem)',
  mobileNavItemSelected: 'var(--color-mobileNavItemSelected)',
  mobileAccountShadow: 'var(--color-mobileAccountShadow)',
  mobileAccountText: 'var(--color-mobileAccountText)',
  mobileTransactionSelected: 'var(--color-mobileTransactionSelected)',
  mobileViewTheme: 'var(--color-mobileViewTheme)',
  mobileConfigServerViewTheme: 'var(--color-mobileConfigServerViewTheme)',
  markdownNormal: 'var(--color-markdownNormal)',
  markdownDark: 'var(--color-markdownDark)',
  markdownLight: 'var(--color-markdownLight)',
  buttonMenuText: 'var(--color-buttonMenuText)',
  buttonMenuTextHover: 'var(--color-buttonMenuTextHover)',
  buttonMenuBackground: 'var(--color-buttonMenuBackground)',
  buttonMenuBackgroundHover: 'var(--color-buttonMenuBackgroundHover)',
  buttonMenuBorder: 'var(--color-buttonMenuBorder)',
  buttonMenuSelectedText: 'var(--color-buttonMenuSelectedText)',
  buttonMenuSelectedTextHover: 'var(--color-buttonMenuSelectedTextHover)',
  buttonMenuSelectedBackground: 'var(--color-buttonMenuSelectedBackground)',
  buttonMenuSelectedBackgroundHover:
    'var(--color-buttonMenuSelectedBackgroundHover)',
  buttonMenuSelectedBorder: 'var(--color-buttonMenuSelectedBorder)',
  buttonPrimaryText: 'var(--color-buttonPrimaryText)',
  buttonPrimaryTextHover: 'var(--color-buttonPrimaryTextHover)',
  buttonPrimaryBackground: 'var(--color-buttonPrimaryBackground)',
  buttonPrimaryBackgroundHover: 'var(--color-buttonPrimaryBackgroundHover)',
  buttonPrimaryBorder: 'var(--color-buttonPrimaryBorder)',
  buttonPrimaryShadow: 'var(--color-buttonPrimaryShadow)',
  buttonPrimaryDisabledText: 'var(--color-buttonPrimaryDisabledText)',
  buttonPrimaryDisabledBackground:
    'var(--color-buttonPrimaryDisabledBackground)',
  buttonPrimaryDisabledBorder: 'var(--color-buttonPrimaryDisabledBorder)',
  buttonNormalText: 'var(--color-buttonNormalText)',
  buttonNormalTextHover: 'var(--color-buttonNormalTextHover)',
  buttonNormalBackground: 'var(--color-buttonNormalBackground)',
  buttonNormalBackgroundHover: 'var(--color-buttonNormalBackgroundHover)',
  buttonNormalBorder: 'var(--color-buttonNormalBorder)',
  buttonNormalShadow: 'var(--color-buttonNormalShadow)',
  buttonNormalSelectedText: 'var(--color-buttonNormalSelectedText)',
  buttonNormalSelectedBackground: 'var(--color-buttonNormalSelectedBackground)',
  buttonNormalDisabledText: 'var(--color-buttonNormalDisabledText)',
  buttonNormalDisabledBackground: 'var(--color-buttonNormalDisabledBackground)',
  buttonNormalDisabledBorder: 'var(--color-buttonNormalDisabledBorder)',
  buttonBareText: 'var(--color-buttonBareText)',
  buttonBareTextHover: 'var(--color-buttonBareTextHover)',
  buttonBareBackground: 'var(--color-buttonBareBackground)',
  buttonBareBackgroundHover: 'var(--color-buttonBareBackgroundHover)',
  buttonBareBackgroundActive: 'var(--color-buttonBareBackgroundActive)',
  buttonBareDisabledText: 'var(--color-buttonBareDisabledText)',
  buttonBareDisabledBackground: 'var(--color-buttonBareDisabledBackground)',
  calendarText: 'var(--color-calendarText)',
  calendarBackground: 'var(--color-calendarBackground)',
  calendarItemText: 'var(--color-calendarItemText)',
  calendarItemBackground: 'var(--color-calendarItemBackground)',
  calendarSelectedBackground: 'var(--color-calendarSelectedBackground)',
  noticeBackground: 'var(--color-noticeBackground)',
  noticeBackgroundLight: 'var(--color-noticeBackgroundLight)',
  noticeBackgroundDark: 'var(--color-noticeBackgroundDark)',
  noticeText: 'var(--color-noticeText)',
  noticeTextLight: 'var(--color-noticeTextLight)',
  noticeTextDark: 'var(--color-noticeTextDark)',
  noticeTextMenu: 'var(--color-noticeTextMenu)',
  noticeTextMenuHover: 'var(--color-noticeTextMenuHover)',
  noticeBorder: 'var(--color-noticeBorder)',
  warningBackground: 'var(--color-warningBackground)',
  warningText: 'var(--color-warningText)',
  warningTextLight: 'var(--color-warningTextLight)',
  warningTextDark: 'var(--color-warningTextDark)',
  warningBorder: 'var(--color-warningBorder)',
  errorBackground: 'var(--color-errorBackground)',
  errorText: 'var(--color-errorText)',
  errorTextDark: 'var(--color-errorTextDark)',
  errorTextDarker: 'var(--color-errorTextDarker)',
  errorTextMenu: 'var(--color-errorTextMenu)',
  errorBorder: 'var(--color-errorBorder)',
  upcomingBackground: 'var(--color-upcomingBackground)',
  upcomingText: 'var(--color-upcomingText)',
  upcomingBorder: 'var(--color-upcomingBorder)',
  formLabelText: 'var(--color-formLabelText)',
  formLabelBackground: 'var(--color-formLabelBackground)',
  formInputBackground: 'var(--color-formInputBackground)',
  formInputBackgroundSelected: 'var(--color-formInputBackgroundSelected)',
  formInputBackgroundSelection: 'var(--color-formInputBackgroundSelection)',
  formInputBorder: 'var(--color-formInputBorder)',
  formInputTextReadOnlySelection: 'var(--color-formInputTextReadOnlySelection)',
  formInputBorderSelected: 'var(--color-formInputBorderSelected)',
  formInputText: 'var(--color-formInputText)',
  formInputTextSelected: 'var(--color-formInputTextSelected)',
  formInputTextPlaceholder: 'var(--color-formInputTextPlaceholder)',
  formInputTextPlaceholderSelected:
    'var(--color-formInputTextPlaceholderSelected)',
  formInputTextSelection: 'var(--color-formInputTextSelection)',
  formInputShadowSelected: 'var(--color-formInputShadowSelected)',
  formInputTextHighlight: 'var(--color-formInputTextHighlight)',
  checkboxText: 'var(--color-checkboxText)',
  checkboxBackgroundSelected: 'var(--color-checkboxBackgroundSelected)',
  checkboxBorderSelected: 'var(--color-checkboxBorderSelected)',
  checkboxShadowSelected: 'var(--color-checkboxShadowSelected)',
  checkboxToggleBackground: 'var(--color-checkboxToggleBackground)',
  checkboxToggleBackgroundSelected:
    'var(--color-checkboxToggleBackgroundSelected)',
  checkboxToggleDisabled: 'var(--color-checkboxToggleDisabled)',
  pillBackground: 'var(--color-pillBackground)',
  pillBackgroundLight: 'var(--color-pillBackgroundLight)',
  pillText: 'var(--color-pillText)',
  pillTextHighlighted: 'var(--color-pillTextHighlighted)',
  pillBorder: 'var(--color-pillBorder)',
  pillBorderDark: 'var(--color-pillBorderDark)',
  pillBackgroundSelected: 'var(--color-pillBackgroundSelected)',
  pillTextSelected: 'var(--color-pillTextSelected)',
  pillBorderSelected: 'var(--color-pillBorderSelected)',
  pillTextSubdued: 'var(--color-pillTextSubdued)',
  reportsRed: 'var(--color-reportsRed)',
  reportsBlue: 'var(--color-reportsBlue)',
  reportsGreen: 'var(--color-reportsGreen)',
  reportsGray: 'var(--color-reportsGray)',
  reportsLabel: 'var(--color-reportsLabel)',
  reportsInnerLabel: 'var(--color-reportsInnerLabel)',
  noteTagBackground: 'var(--color-noteTagBackground)',
  noteTagBackgroundHover: 'var(--color-noteTagBackgroundHover)',
  noteTagText: 'var(--color-noteTagText)',
  budgetOtherMonth: 'var(--color-budgetOtherMonth)',
  budgetCurrentMonth: 'var(--color-budgetCurrentMonth)',
  budgetHeaderOtherMonth: 'var(--color-budgetHeaderOtherMonth)',
  budgetHeaderCurrentMonth: 'var(--color-budgetHeaderCurrentMonth)',
  floatingActionBarBackground: 'var(--color-floatingActionBarBackground)',
  floatingActionBarBorder: 'var(--color-floatingActionBarBorder)',
  floatingActionBarText: 'var(--color-floatingActionBarText)',
  tooltipText: 'var(--color-tooltipText)',
  tooltipBackground: 'var(--color-tooltipBackground)',
  tooltipBorder: 'var(--color-tooltipBorder)',
  calendarCellBackground: 'var(--color-calendarCellBackground)',
};
