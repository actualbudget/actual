import type { colors } from './colors';

type TokenName = keyof typeof colors;

export const contrastMinimums = {
  text: 4.5,
  secondary: 3,
} as const;

export type ContrastLevel = keyof typeof contrastMinimums;

export type ContrastPair = {
  text: TokenName;
  background: TokenName;
  over?: TokenName;
  level: ContrastLevel;
};

function text(
  textToken: TokenName,
  background: TokenName,
  over?: TokenName,
): ContrastPair {
  return { text: textToken, background, over, level: 'text' };
}

function secondary(
  textToken: TokenName,
  background: TokenName,
  over?: TokenName,
): ContrastPair {
  return { text: textToken, background, over, level: 'secondary' };
}

export const contrastPairs: ContrastPair[] = [
  text('pageText', 'pageBackground'),
  text('pageText', 'tableBackground'),
  text('pageText', 'cardBackground'),
  text('pageText', 'modalBackground'),
  text('pageText', 'mobilePageBackground'),
  text('pageTextDark', 'pageBackground'),
  text('pageTextPositive', 'pageBackground'),
  text('pageTextLink', 'pageBackground'),
  text('pageTextLink', 'tableBackground'),
  secondary('pageTextLight', 'pageBackground'),
  secondary('pageTextLight', 'tableBackground'),
  secondary('pageTextLight', 'modalBackground'),
  secondary('pageTextLight', 'mobilePageBackground'),
  secondary('pageTextSubdued', 'pageBackground'),
  secondary('pageTextSubdued', 'tableBackground'),

  text('tableText', 'tableBackground'),
  text('tableText', 'tableRowBackgroundHover'),
  text('tableHeaderText', 'tableHeaderBackground'),
  text('tableRowHeaderText', 'tableRowHeaderBackground'),
  secondary('tableTextLight', 'tableBackground'),
  secondary('tableTextSubdued', 'tableBackground'),

  text('numberPositive', 'tableBackground'),
  text('numberNegative', 'tableBackground'),
  secondary('numberNeutral', 'tableBackground'),
  text('budgetNumberPositive', 'tableBackground'),
  text('budgetNumberNegative', 'tableBackground'),
  secondary('budgetNumberZero', 'tableBackground'),

  text('sidebarItemText', 'sidebarBackground'),
  text('sidebarItemText', 'sidebarItemBackgroundHover', 'sidebarBackground'),
  text('sidebarItemTextSelected', 'sidebarBackground'),
  text('sidebarBudgetName', 'sidebarBackground'),

  text('settingsCardText', 'settingsCardBackground'),
  secondary('settingsCardTextSubdued', 'settingsCardBackground'),

  text('menuItemText', 'menuBackground'),
  text('menuItemTextHover', 'menuItemBackgroundHover'),
  text('menuItemTextSelected', 'menuBackground'),
  secondary('menuItemTextHeader', 'menuBackground'),
  secondary('menuKeybindingText', 'menuBackground'),
  text('menuAutoCompleteText', 'menuAutoCompleteBackground'),
  text('menuAutoCompleteTextHover', 'menuAutoCompleteBackgroundHover'),
  text('menuAutoCompleteItemText', 'menuAutoCompleteBackground'),
  text('menuAutoCompleteItemTextHover', 'menuAutoCompleteBackgroundHover'),
  secondary('menuAutoCompleteTextHeader', 'menuAutoCompleteBackground'),

  text('mobileHeaderText', 'mobileHeaderBackground'),
  secondary('mobileHeaderTextSubdued', 'mobileHeaderBackground'),
  text('mobileNavItem', 'mobileNavBackground'),
  text('mobileNavItemSelected', 'mobileNavBackground'),

  text('buttonPrimaryText', 'buttonPrimaryBackground'),
  text('buttonPrimaryTextHover', 'buttonPrimaryBackgroundHover'),
  text('buttonNormalText', 'buttonNormalBackground'),
  text('buttonNormalTextHover', 'buttonNormalBackgroundHover'),
  text('buttonNormalSelectedText', 'buttonNormalSelectedBackground'),
  text('buttonBareText', 'pageBackground'),
  text('buttonBareText', 'tableBackground'),

  text('noticeText', 'noticeBackground'),
  text('noticeTextDark', 'noticeBackground'),
  text('noticeTextLight', 'tableBackground'),
  text('warningText', 'warningBackground'),
  text('warningTextDark', 'warningBackground'),
  text('warningText', 'tableBackground'),
  text('errorText', 'errorBackground'),
  text('errorTextDark', 'errorBackground'),
  text('errorText', 'tableBackground'),
  text('upcomingText', 'upcomingBackground'),

  text('formInputText', 'formInputBackground'),
  text('formLabelText', 'tableBackground'),
  secondary('formInputTextPlaceholder', 'formInputBackground'),

  text('pillText', 'pillBackground'),
  text('pillTextSelected', 'pillBackgroundSelected'),
  text('noteTagText', 'noteTagBackground'),
  text('tooltipText', 'tooltipBackground'),
  text('calendarText', 'calendarBackground'),
  text('calendarItemText', 'calendarItemBackground'),
  text('floatingActionBarText', 'floatingActionBarBackground'),
];
