# Colors Variables & Default Colors

Actual currently uses approximately 215 color variables and 84 default colors across its many elements. Contributors need to know where and how each color variable is used so changes to one don't affect another.

This document aims to create a full color catalog of Actual for reference.

## Full Color Variable Palette (Light Theme)

This palette can be copied to form the basis of a new theme.
```
--color-pageBackground: #e8ecf0;
--color-pageBackgroundModalActive: #bcccdc;
--color-pageBackgroundTopLeft: #e8ecf0;
--color-pageBackgroundBottomRight: #b3d9ff;
--color-pageBackgroundLineTop: #ffffff;
--color-pageBackgroundLineMid: #e8ecf0;
--color-pageBackgroundLineBottom: #b3d9ff;
--color-pageText: #272630;
--color-pageTextLight: #627d98;
--color-pageTextSubdued: #9fb3c8;
--color-pageTextDark: #243b53;
--color-pageTextPositive: #7a0ecc;
--color-pageTextLink: #1980d4;
--color-pageTextLinkLight: #66b5fa;

--color-numberPositive: #147d64;
--color-numberNegative: #e12d39;
--color-numberNeutral: #e8ecf0;

--color-cardBackground: #ffffff;
--color-cardBorder: #690cb0;
--color-cardShadow: #334e68;

--color-tableBackground: #ffffff;
--color-tableRowBackgroundHover: #f7fafc;
--color-tableText: #272630;
--color-tableTextLight: #829ab1;
--color-tableTextSubdued: #e8ecf0;
--color-tableTextSelected: #334e68;
--color-tableTextHover: #102a43;
--color-tableTextInactive: #627d98;
--color-tableHeaderText: #486581;
--color-tableHeaderBackground: #ffffff;
--color-tableBorder: #e8ecf0;
--color-tableBorderSelected: #8719e0;
--color-tableBorderHover: #9446ed;
--color-tableBorderSeparator: #829ab1;
--color-tableRowBackgroundHighlight: #b3d9ff;
--color-tableRowBackgroundHighlightText: #334e68;
--color-tableRowHeaderBackground: #f7fafc;
--color-tableRowHeaderText: #243b53;

--color-sidebarBackground: #102a43;
--color-sidebarItemBackgroundPending: #fcf088;
--color-sidebarItemBackgroundPositive: #27ab83;
--color-sidebarItemBackgroundFailed: #f86a6a;
--color-sidebarItemAccentSelected: #b990ff;
--color-sidebarItemBackgroundHover: #243b53;
--color-sidebarItemText: #d9e2ec;
--color-sidebarItemTextSelected: #b990ff;
--color-sidebarBudgetName: #d9e2ec;

--color-menuBackground: #ffffff;
--color-menuItemBackground: #f7fafc;
--color-menuItemBackgroundHover: #e8ecf0;
--color-menuItemText: #102a43;
--color-menuItemTextHover: #102a43;
--color-menuItemTextSelected: #a368fc;
--color-menuItemTextHeader: #829ab1;
--color-menuBorder: #e8ecf0;
--color-menuBorderHover: #f2ebfe;
--color-menuKeybindingText: #829ab1;
--color-menuAutoCompleteBackground: #102a43;
--color-menuAutoCompleteBackgroundHover: #486581;
--color-menuAutoCompleteText: #ffffff;
--color-menuAutoCompleteTextHover: #c6f7e2;
--color-menuAutoCompleteTextHeader: #fff7c4;
--color-menuAutoCompleteItemTextHover: #ffffff;
--color-menuAutoCompleteItemText: #ffffff;

--color-modalBackground: #ffffff;
--color-modalBorder: #ffffff;

--color-mobileHeaderBackground: #9446ed;
--color-mobileHeaderText: #f7fafc;
--color-mobileHeaderTextSubdued: #bdc5cf;
--color-mobileHeaderTextHover: rgba(200, 200, 200, .15);
--color-mobilePageBackground: #f7fafc;
--color-mobileNavBackground: #ffffff;
--color-mobileNavItem: #98a1ae;
--color-mobileNavItemSelected: #8719e0;
--color-mobileAccountShadow: #9fb3c8;
--color-mobileAccountText: #0b5fa3;
--color-mobileTransactionSelected: #8719e0;
--color-mobileViewTheme: #9446ed;
--color-mobileConfigServerViewTheme: #8719e0;

--color-markdownNormal: #dac4ff;
--color-markdownDark: #9446ed;
--color-markdownLight: #f2ebfe;

--color-buttonMenuText: #e8ecf0;
--color-buttonMenuTextHover: #f7fafc;
--color-buttonMenuBackground: transparent;
--color-buttonMenuBackgroundHover: rgba(200, 200, 200, 0.25);
--color-buttonMenuBorder: #627d98;
--color-buttonMenuSelectedText: #0c6b58;
--color-buttonMenuSelectedTextHover: #87540d;
--color-buttonMenuSelectedBackground: #fcf088;
--color-buttonMenuSelectedBackgroundHover: #f5e35d;
--color-buttonMenuSelectedBorder: #fcf088;

--color-buttonPrimaryText: #ffffff;
--color-buttonPrimaryTextHover: #ffffff;
--color-buttonPrimaryBackground: #8719e0;
--color-buttonPrimaryBackgroundHover: #a368fc;
--color-buttonPrimaryBorder: #8719e0;
--color-buttonPrimaryShadow: rgba(0, 0, 0, 0.3);
--color-buttonPrimaryDisabledText: #ffffff;
--color-buttonPrimaryDisabledBackground: #9fb3c8;
--color-buttonPrimaryDisabledBorder: #9fb3c8;

--color-buttonNormalText: #102a43;
--color-buttonNormalTextHover: #102a43;
--color-buttonNormalBackground: #ffffff;
--color-buttonNormalBackgroundHover: #ffffff;
--color-buttonNormalBorder: #d9e2ec;
--color-buttonNormalShadow: rgba(0, 0, 0, 0.2);
--color-buttonNormalSelectedText: #ffffff;
--color-buttonNormalSelectedBackground: #1980d4;
--color-buttonNormalDisabledText: #9fb3c8;
--color-buttonNormalDisabledBackground: #ffffff;
--color-buttonNormalDisabledBorder: #d9e2ec;

--color-buttonBareText: #102a43;
--color-buttonBareTextHover: #102a43;
--color-buttonBareBackground: transparent;
--color-buttonBareBackgroundHover: rgba(100, 100, 100, .15);
--color-buttonBareBackgroundActive: rgba(100, 100, 100, .25);
--color-buttonBareDisabledText: #9fb3c8;
--color-buttonBareDisabledBackground: transparent;

--color-calendarText: #f7fafc;
--color-calendarBackground: #102a43;
--color-calendarItemText: #d9e2ec;
--color-calendarItemBackground: #243b53;
--color-calendarSelectedBackground: #627d98;
--color-calendarCellBackground: #e8ecf0;

--color-noticeBackground: #c6f7e2;
--color-noticeBackgroundLight: #effcf6;
--color-noticeBackgroundDark: #27ab83;
--color-noticeText: #147d64;
--color-noticeTextLight: #27ab83;
--color-noticeTextDark: #014d40;
--color-noticeTextMenu: #8eedc7;
--color-noticeBorder: #27ab83;

--color-warningBackground: #fcf088;
--color-warningText: #b88115;
--color-warningTextLight: #e6bb20;
--color-warningTextDark: #733309;
--color-warningBorder: #e6bb20;

--color-errorBackground: #ffe3e3;
--color-errorText: #e12d39;
--color-errorTextDark: #ab091e;
--color-errorTextDarker: #610316;
--color-errorTextMenu: #ff9b9b;
--color-errorBorder: #e12d39;

--color-upcomingBackground: #f2ebfe;
--color-upcomingText: #690cb0;
--color-upcomingBorder: #8719e0;

--color-formLabelText: #1980d4;
--color-formLabelBackground: #8bcafd;
--color-formInputBackground: #f7fafc;
--color-formInputBackgroundSelected: #ffffff;
--color-formInputBackgroundSelection: #8719e0;
--color-formInputBorder: #d9e2ec;
--color-formInputTextReadOnlySelection: #f7fafc;
--color-formInputBorderSelected: #8719e0;
--color-formInputText: #102a43;
--color-formInputTextSelected: #f7fafc;
--color-formInputTextPlaceholder: #9fb3c8;
--color-formInputTextPlaceholderSelected: #bcccdc;
--color-formInputTextSelection: #e8ecf0;
--color-formInputShadowSelected: #a368fc;
--color-formInputTextHighlight: #b990ff;

--color-checkboxText: #ffffff;
--color-checkboxBackgroundSelected: #2b8fed;
--color-checkboxBorderSelected: #2b8fed;
--color-checkboxShadowSelected: #66b5fa;
--color-checkboxToggleBackground: #747c8b;
--color-checkboxToggleBackgroundSelected: #7a0ecc;
--color-checkboxToggleDisabled: #bdc5cf;

--color-pillBackground: #d9e2ec;
--color-pillBackgroundLight: #f7fafc;
--color-pillText: #243b53;
--color-pillTextHighlighted: #7a0ecc;
--color-pillBorder: #d9e2ec;
--color-pillBorderDark: #9fb3c8;
--color-pillBackgroundSelected: #b3d9ff;
--color-pillTextSelected: #034388;
--color-pillBorderSelected: #8719e0;
--color-pillTextSubdued: #bcccdc;

--color-reportsRed: #f86a6a;
--color-reportsBlue: #40a5f7;
--color-reportsGreen: #3ebd93;
--color-reportsGray: #747c8b;
--color-reportsLabel: #102a43;
--color-reportsInnerLabel: #243b53;
--color-reportsNumberPositive: #147d64;
--color-reportsNumberNegative: #e12d39;
--color-reportsNumberNeutral: #e8ecf0;
--color-reportsChartFill: #147d64;

--color-noteTagBackground: #e4d4ff;
--color-noteTagBackgroundHover: #dac4ff;
--color-noteTagDefault: #e4d4ff;
--color-noteTagText: #000000;

--color-budgetCurrentMonth: #ffffff;
--color-budgetOtherMonth: #f6f8fa;
--color-budgetHeaderCurrentMonth: #f6f8fa;
--color-budgetHeaderOtherMonth: #f0f4f6;
--color-budgetNumberZero: #e8ecf0;
--color-budgetNumberNegative: #e12d39;
--color-budgetNumberNeutral: #272630;
--color-budgetNumberPositive: #272630;
--color-templateNumberFunded: #147d64;
--color-templateNumberUnderFunded: #b88115;
--color-toBudgetPositive: #147d64;
--color-toBudgetZero: #147d64;
--color-toBudgetNegative: #e12d39;

--color-floatingActionBarBackground: #9446ed;
--color-floatingActionBarBorder: #9446ed;
--color-floatingActionBarText: #f7fafc;

--color-tooltipText: #102a43;
--color-tooltipBackground: #ffffff;
--color-tooltipBorder: #d9e2ec;

--color-overlayBackground: rgba(0, 0, 0, 0.3);
```

A list of the color palette variables used:

| Color Variable                          | Color Palette                            | Color Code                     |
| --------------------------------------- | ---------------------------------------- | ------------------------------ |
| pageBackground: | navy100 | #e8ecf0 |
| pageBackgroundModalActive: | navy200 | #bcccdc |
| pageBackgroundTopLeft: | navy100 | #e8ecf0 |
| pageBackgroundBottomRight: | blue150 | #b3d9ff |
| pageBackgroundLineTop: | white | #ffffff |
| pageBackgroundLineMid: | navy100 | #e8ecf0 |
| pageBackgroundLineBottom: | blue150 | #b3d9ff |
| pageText: |   | #272630 |
| pageTextLight: | navy500 | #627d98 |
| pageTextSubdued: | navy300 | #9fb3c8 |
| pageTextDark: | navy800 | #243b53 |
| pageTextPositive: | purple600 | #7a0ecc |
| pageTextLink: | blue600 | #1980d4 |
| pageTextLinkLight: | blue300 | #66b5fa |
| numberPositive: | green700 | #147d64 |
| numberNegative: | red500 | #e12d39 |
| numberNeutral: | navy100 | #e8ecf0 |
| cardBackground: | white | #ffffff |
| cardBorder: | purple700 | #690cb0 |
| cardShadow: | navy700 | #334e68 |
| tableBackground: | white | #ffffff |
| tableRowBackgroundHover: | navy50 | #f7fafc |
| tableText: | pageText | #272630 |
| tableTextLight: | navy400 | #829ab1 |
| tableTextSubdued: | navy100 | #e8ecf0 |
| tableTextSelected: | navy700 | #334e68 |
| tableTextHover: | navy900 | #102a43 |
| tableTextInactive: | navy500 | #627d98 |
| tableHeaderText: | navy600 | #486581 |
| tableHeaderBackground: | white | #ffffff |
| tableBorder: | navy100 | #e8ecf0 |
| tableBorderSelected: | purple500 | #8719e0 |
| tableBorderHover: | purple400 | #9446ed |
| tableBorderSeparator: | navy400 | #829ab1 |
| tableRowBackgroundHighlight: | blue150 | #b3d9ff |
| tableRowBackgroundHighlightText: | navy700 | #334e68 |
| tableRowHeaderBackground: | navy50 | #f7fafc |
| tableRowHeaderText: | navy800 | #243b53 |
| sidebarBackground: | navy900 | #102a43 |
| sidebarItemBackgroundPending: | orange200 | #fcf088 |
| sidebarItemBackgroundPositive: | green500 | #27ab83 |
| sidebarItemBackgroundFailed: | red300 | #f86a6a |
| sidebarItemAccentSelected: | purple200 | #b990ff |
| sidebarItemBackgroundHover: | navy800 | #243b53 |
| sidebarItemText: | navy150 | #d9e2ec |
| sidebarItemTextSelected: | purple200 | #b990ff |
| sidebarBudgetName: | navy150 | #d9e2ec |
| menuBackground: | white | #ffffff |
| menuItemBackground: | navy50 | #f7fafc |
| menuItemBackgroundHover: | navy100 | #e8ecf0 |
| menuItemText: | navy900 | #102a43 |
| menuItemTextHover: | menuItemText | #102a43 |
| menuItemTextSelected: | purple300 | #a368fc |
| menuItemTextHeader: | navy400 | #829ab1 |
| menuBorder: | navy100 | #e8ecf0 |
| menuBorderHover: | purple100 | #f2ebfe |
| menuKeybindingText: | navy400 | #829ab1 |
| menuAutoCompleteBackground: | navy900 | #102a43 |
| menuAutoCompleteBackgroundHover: | navy600 | #486581 |
| menuAutoCompleteText: | white | #ffffff |
| menuAutoCompleteTextHover: | green150 | #c6f7e2 |
| menuAutoCompleteTextHeader: | orange150 | #fff7c4 |
| menuAutoCompleteItemTextHover: | menuAutoCompleteText | #ffffff |
| menuAutoCompleteItemText: | menuAutoCompleteText | #ffffff |
| modalBackground: | white | #ffffff |
| modalBorder: | white | #ffffff |
| mobileHeaderBackground: | purple400 | #9446ed |
| mobileHeaderText: | navy50 | #f7fafc |
| mobileHeaderTextSubdued: | gray200 | #bdc5cf |
| mobileHeaderTextHover: |   | rgba(200, 200, 200, .15) |
| mobilePageBackground: | navy50 | #f7fafc |
| mobileNavBackground: | white | #ffffff |
| mobileNavItem: | gray300 | #98a1ae |
| mobileNavItemSelected: | purple500 | #8719e0 |
| mobileAccountShadow: | navy300 | #9fb3c8 |
| mobileAccountText: | blue800 | #0b5fa3 |
| mobileTransactionSelected: | purple500 | #8719e0 |
| mobileViewTheme: | mobileHeaderBackground | #9446ed |
| mobileConfigServerViewTheme: | purple500 | #8719e0 |
| markdownNormal: | purple150 | #dac4ff |
| markdownDark: | purple400 | #9446ed |
| markdownLight: | purple100 | #f2ebfe |
| buttonMenuText: | navy100 | #e8ecf0 |
| buttonMenuTextHover: | navy50 | #f7fafc |
| buttonMenuBackground: |   | transparent |
| buttonMenuBackgroundHover: |   | rgba(200, 200, 200, 0.25) |
| buttonMenuBorder: | navy500 | #627d98 |
| buttonMenuSelectedText: | green800 | #0c6b58 |
| buttonMenuSelectedTextHover: | orange800 | #87540d |
| buttonMenuSelectedBackground: | orange200 | #fcf088 |
| buttonMenuSelectedBackgroundHover: | orange300 | #f5e35d |
| buttonMenuSelectedBorder: | buttonMenuSelectedBackground | #fcf088 |
| buttonPrimaryText: | white | #ffffff |
| buttonPrimaryTextHover: | buttonPrimaryText | #ffffff |
| buttonPrimaryBackground: | purple500 | #8719e0 |
| buttonPrimaryBackgroundHover: | purple300 | #a368fc |
| buttonPrimaryBorder: | buttonPrimaryBackground | #8719e0 |
| buttonPrimaryShadow: |   | rgba(0, 0, 0, 0.3) |
| buttonPrimaryDisabledText: | white | #ffffff |
| buttonPrimaryDisabledBackground: | navy300 | #9fb3c8 |
| buttonPrimaryDisabledBorder: | buttonPrimaryDisabledBackground | #9fb3c8 |
| buttonNormalText: | navy900 | #102a43 |
| buttonNormalTextHover: | buttonNormalText | #102a43 |
| buttonNormalBackground: | white | #ffffff |
| buttonNormalBackgroundHover: | buttonNormalBackground | #ffffff |
| buttonNormalBorder: | navy150 | #d9e2ec |
| buttonNormalShadow: |   | rgba(0, 0, 0, 0.2) |
| buttonNormalSelectedText: | white | #ffffff |
| buttonNormalSelectedBackground: | blue600 | #1980d4 |
| buttonNormalDisabledText: | navy300 | #9fb3c8 |
| buttonNormalDisabledBackground: | buttonNormalBackground | #ffffff |
| buttonNormalDisabledBorder: | buttonNormalBorder | #d9e2ec |
| buttonBareText: | buttonNormalText | #102a43 |
| buttonBareTextHover: | buttonNormalText | #102a43 |
| buttonBareBackground: |   | transparent |
| buttonBareBackgroundHover: |   | rgba(100, 100, 100, .15) |
| buttonBareBackgroundActive: |   | rgba(100, 100, 100, .25) |
| buttonBareDisabledText: | buttonNormalDisabledText | #9fb3c8 |
| buttonBareDisabledBackground: | buttonBareBackground | transparent |
| calendarText: | navy50 | #f7fafc |
| calendarBackground: | navy900 | #102a43 |
| calendarItemText: | navy150 | #d9e2ec |
| calendarItemBackground: | navy800 | #243b53 |
| calendarSelectedBackground: | navy500 | #627d98 |
| calendarCellBackground: | navy100 | #e8ecf0 |
| noticeBackground: | green150 | #c6f7e2 |
| noticeBackgroundLight: | green100 | #effcf6 |
| noticeBackgroundDark: | green500 | #27ab83 |
| noticeText: | green700 | #147d64 |
| noticeTextLight: | green500 | #27ab83 |
| noticeTextDark: | green900 | #014d40 |
| noticeTextMenu: | green200 | #8eedc7 |
| noticeBorder: | green500 | #27ab83 |
| warningBackground: | orange200 | #fcf088 |
| warningText: | orange700 | #b88115 |
| warningTextLight: | orange500 | #e6bb20 |
| warningTextDark: | orange900 | #733309 |
| warningBorder: | orange500 | #e6bb20 |
| errorBackground: | red100 | #ffe3e3 |
| errorText: | red500 | #e12d39 |
| errorTextDark: | red700 | #ab091e |
| errorTextDarker: | red900 | #610316 |
| errorTextMenu: | red200 | #ff9b9b |
| errorBorder: | red500 | #e12d39 |
| upcomingBackground: | purple100 | #f2ebfe |
| upcomingText: | purple700 | #690cb0 |
| upcomingBorder: | purple500 | #8719e0 |
| formLabelText: | blue600 | #1980d4 |
| formLabelBackground: | blue200 | #8bcafd |
| formInputBackground: | navy50 | #f7fafc |
| formInputBackgroundSelected: | white | #ffffff |
| formInputBackgroundSelection: | purple500 | #8719e0 |
| formInputBorder: | navy150 | #d9e2ec |
| formInputTextReadOnlySelection: | navy50 | #f7fafc |
| formInputBorderSelected: | purple500 | #8719e0 |
| formInputText: | navy900 | #102a43 |
| formInputTextSelected: | navy50 | #f7fafc |
| formInputTextPlaceholder: | navy300 | #9fb3c8 |
| formInputTextPlaceholderSelected: | navy200 | #bcccdc |
| formInputTextSelection: | navy100 | #e8ecf0 |
| formInputShadowSelected: | purple300 | #a368fc |
| formInputTextHighlight: | purple200 | #b990ff |
| checkboxText: | tableBackground | #ffffff |
| checkboxBackgroundSelected: | blue500 | #2b8fed |
| checkboxBorderSelected: | blue500 | #2b8fed |
| checkboxShadowSelected: | blue300 | #66b5fa |
| checkboxToggleBackground: | gray400 | #747c8b |
| checkboxToggleBackgroundSelected: | purple600 | #7a0ecc |
| checkboxToggleDisabled: | gray200 | #bdc5cf |
| pillBackground: | navy150 | #d9e2ec |
| pillBackgroundLight: | navy50 | #f7fafc |
| pillText: | navy800 | #243b53 |
| pillTextHighlighted: | purple600 | #7a0ecc |
| pillBorder: | navy150 | #d9e2ec |
| pillBorderDark: | navy300 | #9fb3c8 |
| pillBackgroundSelected: | blue150 | #b3d9ff |
| pillTextSelected: | blue900 | #034388 |
| pillBorderSelected: | purple500 | #8719e0 |
| pillTextSubdued: | navy200 | #bcccdc |
| reportsRed: | red300 | #f86a6a |
| reportsBlue: | blue400 | #40a5f7 |
| reportsGreen: | green400 | #3ebd93 |
| reportsGray: | gray400 | #747c8b |
| reportsLabel: | navy900 | #102a43 |
| reportsInnerLabel: | navy800 | #243b53 |
| reportsNumberPositive: | numberPositive | #147d64 |
| reportsNumberNegative: | numberNegative | #e12d39 |
| reportsNumberNeutral: | numberNeutral | #e8ecf0 |
| reportsChartFill: | reportsNumberPositive | #147d64 |
| noteTagBackground: | purple125 | #e4d4ff |
| noteTagBackgroundHover: | purple150 | #dac4ff |
| noteTagDefault: | purple125 | #e4d4ff |
| noteTagText: | black | #000000 |
| budgetCurrentMonth: | tableBackground | #ffffff |
| budgetOtherMonth: | gray50 | #f6f8fa |
| budgetHeaderCurrentMonth: | budgetOtherMonth | #f6f8fa |
| budgetHeaderOtherMonth: | gray80 | #f0f4f6 |
| budgetNumberZero: | tableTextSubdued | #e8ecf0 |
| budgetNumberNegative: | numberNegative | #e12d39 |
| budgetNumberNeutral: | tableText | #272630 |
| budgetNumberPositive: | budgetNumberNeutral | #272630 |
| templateNumberFunded: | numberPositive | #147d64 |
| templateNumberUnderFunded: | orange700 | #b88115 |
| toBudgetPositive: | numberPositive | #147d64 |
| toBudgetZero: | numberPositive | #147d64 |
| toBudgetNegative: | budgetNumberNegative | #e12d39 |
| floatingActionBarBackground: | purple400 | #9446ed |
| floatingActionBarBorder: | floatingActionBarBackground | #9446ed |
| floatingActionBarText: | navy50 | #f7fafc |
| tooltipText: | navy900 | #102a43 |
| tooltipBackground: | white | #ffffff |
| tooltipBorder: | navy150 | #d9e2ec |
| overlayBackground: |   | rgba(0, 0, 0, 0.3) |


## Full Color Variable Palette (Dark Theme)

This palette can be copied to form the basis of a new theme.

## Page Variables

## Table Variables

## Sidebar Variables

## Menu Variables

## Mobile Variables

## Button Variables

### Menu Buttons

### Primary Buttons

### Normal Buttons

### Bare Buttons

## Notices, Warnings and Errors

## Form Inputs

### Checkboxes

## Report Variables

## Pill Variables

### Upcoming pills

### Tag pills

## Budget Variables

## Miscellaneous Variables

### Modals

### Markdown

### Calendar

### Floating Action Bar

### Tooltip

### Overlay Background
