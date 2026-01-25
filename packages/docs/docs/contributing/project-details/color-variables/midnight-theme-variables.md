# Midnight Theme Color Palette

This palette can be copied to form the basis of a new theme.

```css
/* Actual Midnight Theme */

--color-pageBackground: #373b4a;
--color-pageBackgroundModalActive: #242733;
--color-pageBackgroundTopLeft: #141520;
--color-pageBackgroundBottomRight: #242733;
--color-pageBackgroundLineTop: #a368fc;
--color-pageBackgroundLineMid: #080811;
--color-pageBackgroundLineBottom: #d4dae0;
--color-pageText: #e8ecf0;
--color-pageTextLight: #bdc5cf;
--color-pageTextSubdued: #747c8b;
--color-pageTextDark: #e8ecf0;
--color-pageTextPositive: #b990ff;
--color-pageTextLink: #a368fc;
--color-pageTextLinkLight: #a368fc;

--color-numberPositive: #65d6ad;
--color-numberNegative: #ff9b9b;
--color-numberNeutral: #4d5768;

--color-cardBackground: #141520;
--color-cardBorder: #a368fc;
--color-cardShadow: #080811;

--color-tableBackground: #141520;
--color-tableRowBackgroundHover: #4d5768;
--color-tableText: #d4dae0;
--color-tableTextLight: #d4dae0;
--color-tableTextSubdued: #4d5768;
--color-tableTextSelected: #141520;
--color-tableTextHover: #747c8b;
--color-tableTextInactive: #747c8b;
--color-tableHeaderText: #bdc5cf;
--color-tableHeaderBackground: #080811;
--color-tableBorder: #373b4a;
--color-tableBorderSelected: #9446ed;
--color-tableBorderHover: #a368fc;
--color-tableBorderSeparator: #747c8b;
--color-tableRowBackgroundHighlight: #dac4ff;
--color-tableRowBackgroundHighlightText: #141520;
--color-tableRowHeaderBackground: #242733;
--color-tableRowHeaderText: #d4dae0;

--color-sidebarBackground: #080811;
--color-sidebarItemBackgroundPending: #fcf088;
--color-sidebarItemBackgroundPositive: #3ebd93;
--color-sidebarItemBackgroundFailed: #f86a6a;
--color-sidebarItemAccentSelected: #b990ff;
--color-sidebarItemBackgroundHover: #242733;
--color-sidebarItemText: #e8ecf0;
--color-sidebarItemTextSelected: #b990ff;
--color-sidebarBudgetName: #98a1ae;

--color-menuBackground: #242733;
--color-menuItemBackground: #bdc5cf;
--color-menuItemBackgroundHover: #4d5768;
--color-menuItemText: #e8ecf0;
--color-menuItemTextHover: #f6f8fa;
--color-menuItemTextSelected: #9446ed;
--color-menuItemTextHeader: #b990ff;
--color-menuBorder: #141520;
--color-menuBorderHover: #a368fc;
--color-menuKeybindingText: #b990ff;
--color-menuAutoCompleteBackground: #373b4a;
--color-menuAutoCompleteBackgroundHover: #4d5768;
--color-menuAutoCompleteText: #e8ecf0;
--color-menuAutoCompleteTextHover: #014d40;
--color-menuAutoCompleteTextHeader: #b990ff;
--color-menuAutoCompleteItemTextHover: #f6f8fa;
--color-menuAutoCompleteItemText: #e8ecf0;

--color-modalBackground: #242733;
--color-modalBorder: #bdc5cf;

--color-mobileHeaderBackground: #080811;
--color-mobileHeaderText: #b990ff;
--color-mobileHeaderTextSubdued: #bdc5cf;
--color-mobileHeaderTextHover: rgba(200, 200, 200, .15);
--color-mobilePageBackground: #080811;
--color-mobileNavBackground: #373b4a;
--color-mobileNavItem: #d4dae0;
--color-mobileNavItemSelected: #b990ff;
--color-mobileAccountShadow: #080811;
--color-mobileAccountText: #0b5fa3;
--color-mobileTransactionSelected: #a368fc;
--color-mobileViewTheme: #080811;
--color-mobileConfigServerViewTheme: #8719e0;

--color-markdownNormal: #690cb0;
--color-markdownDark: #8719e0;
--color-markdownLight: #580a94;

--color-buttonMenuText: #bdc5cf;
--color-buttonMenuTextHover: #bdc5cf;
--color-buttonMenuBackground: #242733;
--color-buttonMenuBackgroundHover: rgba(200, 200, 200, .25);
--color-buttonMenuBorder: #4d5768;
--color-buttonMenuSelectedText: #0c6b58;
--color-buttonMenuSelectedTextHover: #87540d;
--color-buttonMenuSelectedBackground: #fcf088;
--color-buttonMenuSelectedBackgroundHover: #98a1ae;
--color-buttonMenuSelectedBorder: #fcf088;

--color-buttonPrimaryText: #ffffff;
--color-buttonPrimaryTextHover: #ffffff;
--color-buttonPrimaryBackground: #a368fc;
--color-buttonPrimaryBackgroundHover: #a368fc;
--color-buttonPrimaryBorder: #a368fc;
--color-buttonPrimaryShadow: rgba(0, 0, 0, 0.6);
--color-buttonPrimaryDisabledText: #747c8b;
--color-buttonPrimaryDisabledBackground: #242733;
--color-buttonPrimaryDisabledBorder: #242733;

--color-buttonNormalText: #d4dae0;
--color-buttonNormalTextHover: #d4dae0;
--color-buttonNormalBackground: #373b4a;
--color-buttonNormalBackgroundHover: #747c8b;
--color-buttonNormalBorder: #98a1ae;
--color-buttonNormalShadow: rgba(0, 0, 0, 0.4);
--color-buttonNormalSelectedText: #ffffff;
--color-buttonNormalSelectedBackground: #8719e0;
--color-buttonNormalDisabledText: #747c8b;
--color-buttonNormalDisabledBackground: #242733;
--color-buttonNormalDisabledBorder: #4d5768;

--color-buttonBareText: #d4dae0;
--color-buttonBareTextHover: #d4dae0;
--color-buttonBareBackground: transparent;
--color-buttonBareBackgroundHover: rgba(200, 200, 200, .3);
--color-buttonBareBackgroundActive: rgba(200, 200, 200, .5);
--color-buttonBareDisabledText: #747c8b;
--color-buttonBareDisabledBackground: transparent;

--color-calendarText: #f6f8fa;
--color-calendarBackground: #242733;
--color-calendarItemText: #d4dae0;
--color-calendarItemBackground: #4d5768;
--color-calendarSelectedBackground: #8719e0;
--color-calendarCellBackground: #102a43;

--color-noticeBackground: #199473;
--color-noticeBackgroundLight: #014d40;
--color-noticeBackgroundDark: #3ebd93;
--color-noticeText: #65d6ad;
--color-noticeTextLight: #3ebd93;
--color-noticeTextDark: #c6f7e2;
--color-noticeTextMenu: #3ebd93;
--color-noticeTextMenuHover: #147d64;
--color-noticeBorder: #0c6b58;

--color-warningBackground: #87540d;
--color-warningText: #fcf088;
--color-warningTextLight: #e6bb20;
--color-warningTextDark: #fffbea;
--color-warningBorder: #e6bb20;

--color-errorBackground: #8a041a;
--color-errorText: #ff9b9b;
--color-errorTextDark: #ffbdbd;
--color-errorTextDarker: #ffbdbd;
--color-errorTextMenu: #ff9b9b;
--color-errorBorder: #e12d39;

--color-upcomingBackground: #580a94;
--color-upcomingText: #b990ff;
--color-upcomingBorder: #373b4a;

--color-formLabelText: #dac4ff;
--color-formLabelBackground: #034388;
--color-formInputBackground: #141520;
--color-formInputBackgroundSelected: #242733;
--color-formInputBackgroundSelection: #9446ed;
--color-formInputBorder: #373b4a;
--color-formInputTextReadOnlySelection: #141520;
--color-formInputBorderSelected: #a368fc;
--color-formInputText: #d4dae0;
--color-formInputTextSelected: #000000;
--color-formInputTextPlaceholder: #d4dae0;
--color-formInputTextPlaceholderSelected: #e8ecf0;
--color-formInputTextSelection: #141520;
--color-formInputShadowSelected: #9446ed;
--color-formInputTextHighlight: #b990ff;

--color-checkboxText: #d4dae0;
--color-checkboxBackgroundSelected: #a368fc;
--color-checkboxBorderSelected: #a368fc;
--color-checkboxShadowSelected: #8719e0;
--color-checkboxToggleBackground: #747c8b;
--color-checkboxToggleBackgroundSelected: #a368fc;
--color-checkboxToggleDisabled: #242733;

--color-pillBackground: #4d5768;
--color-pillBackgroundLight: #080811;
--color-pillText: #bdc5cf;
--color-pillTextHighlighted: #b990ff;
--color-pillBorder: #4d5768;
--color-pillBorderDark: #4d5768;
--color-pillBackgroundSelected: #7a0ecc;
--color-pillTextSelected: #d4dae0;
--color-pillBorderSelected: #a368fc;
--color-pillTextSubdued: #4d5768;

--color-reportsRed: #f86a6a;
--color-reportsBlue: #40a5f7;
--color-reportsGreen: #3ebd93;
--color-reportsGray: #747c8b;
--color-reportsLabel: #e8ecf0;
--color-reportsInnerLabel: #243b53;
--color-reportsNumberPositive: #65d6ad;
--color-reportsNumberNegative: #ff9b9b;
--color-reportsNumberNeutral: #4d5768;
--color-reportsChartFill: #65d6ad;

--color-noteTagBackground: #580a94;
--color-noteTagBackgroundHover: #7a0ecc;
--color-noteTagDefault: #690cb0;
--color-noteTagText: #f2ebfe;

--color-budgetCurrentMonth: #141520;
--color-budgetOtherMonth: #242733;
--color-budgetHeaderCurrentMonth: #080811;
--color-budgetHeaderOtherMonth: #141520;
--color-budgetNumberZero: #4d5768;
--color-budgetNumberNegative: #ff9b9b;
--color-budgetNumberNeutral: #d4dae0;
--color-budgetNumberPositive: #d4dae0;
--color-templateNumberFunded: #65d6ad;
--color-templateNumberUnderFunded: #fcf088;
--color-toBudgetPositive: #65d6ad;
--color-toBudgetZero: #65d6ad;
--color-toBudgetNegative: #ff9b9b;

--color-floatingActionBarBackground: #080811;
--color-floatingActionBarBorder: #a368fc;
--color-floatingActionBarText: #b990ff;

--color-tooltipText: #e8ecf0;
--color-tooltipBackground: #141520;
--color-tooltipBorder: #373b4a;

--color-overlayBackground: rgba(0, 0, 0, 0.3);
```

A list of the color palette variables used in the Midnight Theme:

| Color Variable                     | Color Palette                   | Color Code               |                         Color Swatch                         |
| ---------------------------------- | ------------------------------- | ------------------------ | :----------------------------------------------------------: |
| pageBackground:                    | gray600                         | #373b4a                  | <img src="https://www.colorhexa.com/373b4a.png" width="50"/> |
| pageBackgroundModalActive:         | gray700                         | #242733                  | <img src="https://www.colorhexa.com/242733.png" width="50"/> |
| pageBackgroundTopLeft:             | gray800                         | #141520                  | <img src="https://www.colorhexa.com/141520.png" width="50"/> |
| pageBackgroundBottomRight:         | gray700                         | #242733                  | <img src="https://www.colorhexa.com/242733.png" width="50"/> |
| pageBackgroundLineTop:             | purple300                       | #a368fc                  | <img src="https://www.colorhexa.com/a368fc.png" width="50"/> |
| pageBackgroundLineMid:             | gray900                         | #080811                  | <img src="https://www.colorhexa.com/080811.png" width="50"/> |
| pageBackgroundLineBottom:          | gray150                         | #d4dae0                  | <img src="https://www.colorhexa.com/d4dae0.png" width="50"/> |
| pageText:                          | gray100                         | #e8ecf0                  | <img src="https://www.colorhexa.com/e8ecf0.png" width="50"/> |
| pageTextLight:                     | gray200                         | #bdc5cf                  | <img src="https://www.colorhexa.com/bdc5cf.png" width="50"/> |
| pageTextSubdued:                   | gray400                         | #747c8b                  | <img src="https://www.colorhexa.com/747c8b.png" width="50"/> |
| pageTextDark:                      | gray100                         | #e8ecf0                  | <img src="https://www.colorhexa.com/e8ecf0.png" width="50"/> |
| pageTextPositive:                  | purple200                       | #b990ff                  | <img src="https://www.colorhexa.com/b990ff.png" width="50"/> |
| pageTextLink:                      | purple300                       | #a368fc                  | <img src="https://www.colorhexa.com/a368fc.png" width="50"/> |
| pageTextLinkLight:                 | purple300                       | #a368fc                  | <img src="https://www.colorhexa.com/a368fc.png" width="50"/> |
| numberPositive:                    | green300                        | #65d6ad                  | <img src="https://www.colorhexa.com/65d6ad.png" width="50"/> |
| numberNegative:                    | red200                          | #ff9b9b                  | <img src="https://www.colorhexa.com/ff9b9b.png" width="50"/> |
| numberNeutral:                     | gray500                         | #4d5768                  | <img src="https://www.colorhexa.com/4d5768.png" width="50"/> |
| cardBackground:                    | gray800                         | #141520                  | <img src="https://www.colorhexa.com/141520.png" width="50"/> |
| cardBorder:                        | purple300                       | #a368fc                  | <img src="https://www.colorhexa.com/a368fc.png" width="50"/> |
| cardShadow:                        | gray900                         | #080811                  | <img src="https://www.colorhexa.com/080811.png" width="50"/> |
| tableBackground:                   | gray800                         | #141520                  | <img src="https://www.colorhexa.com/141520.png" width="50"/> |
| tableRowBackgroundHover:           | gray500                         | #4d5768                  | <img src="https://www.colorhexa.com/4d5768.png" width="50"/> |
| tableText:                         | gray150                         | #d4dae0                  | <img src="https://www.colorhexa.com/d4dae0.png" width="50"/> |
| tableTextLight:                    | tableText                       | #d4dae0                  | <img src="https://www.colorhexa.com/d4dae0.png" width="50"/> |
| tableTextSubdued:                  | gray500                         | #4d5768                  | <img src="https://www.colorhexa.com/4d5768.png" width="50"/> |
| tableTextSelected:                 | gray800                         | #141520                  | <img src="https://www.colorhexa.com/141520.png" width="50"/> |
| tableTextHover:                    | gray400                         | #747c8b                  | <img src="https://www.colorhexa.com/747c8b.png" width="50"/> |
| tableTextInactive:                 | gray400                         | #747c8b                  | <img src="https://www.colorhexa.com/747c8b.png" width="50"/> |
| tableHeaderText:                   | gray200                         | #bdc5cf                  | <img src="https://www.colorhexa.com/bdc5cf.png" width="50"/> |
| tableHeaderBackground:             | gray900                         | #080811                  | <img src="https://www.colorhexa.com/080811.png" width="50"/> |
| tableBorder:                       | gray600                         | #373b4a                  | <img src="https://www.colorhexa.com/373b4a.png" width="50"/> |
| tableBorderSelected:               | purple400                       | #9446ed                  | <img src="https://www.colorhexa.com/9446ed.png" width="50"/> |
| tableBorderHover:                  | purple300                       | #a368fc                  | <img src="https://www.colorhexa.com/a368fc.png" width="50"/> |
| tableBorderSeparator:              | gray400                         | #747c8b                  | <img src="https://www.colorhexa.com/747c8b.png" width="50"/> |
| tableRowBackgroundHighlight:       | purple150                       | #dac4ff                  | <img src="https://www.colorhexa.com/dac4ff.png" width="50"/> |
| tableRowBackgroundHighlightText:   | gray800                         | #141520                  | <img src="https://www.colorhexa.com/141520.png" width="50"/> |
| tableRowHeaderBackground:          | gray700                         | #242733                  | <img src="https://www.colorhexa.com/242733.png" width="50"/> |
| tableRowHeaderText:                | gray150                         | #d4dae0                  | <img src="https://www.colorhexa.com/d4dae0.png" width="50"/> |
| sidebarBackground:                 | gray900                         | #080811                  | <img src="https://www.colorhexa.com/080811.png" width="50"/> |
| sidebarItemBackgroundPending:      | orange200                       | #fcf088                  | <img src="https://www.colorhexa.com/fcf088.png" width="50"/> |
| sidebarItemBackgroundPositive:     | green400                        | #3ebd93                  | <img src="https://www.colorhexa.com/3ebd93.png" width="50"/> |
| sidebarItemBackgroundFailed:       | red300                          | #f86a6a                  | <img src="https://www.colorhexa.com/f86a6a.png" width="50"/> |
| sidebarItemAccentSelected:         | purple200                       | #b990ff                  | <img src="https://www.colorhexa.com/b990ff.png" width="50"/> |
| sidebarItemBackgroundHover:        | gray700                         | #242733                  | <img src="https://www.colorhexa.com/242733.png" width="50"/> |
| sidebarItemText:                   | gray100                         | #e8ecf0                  | <img src="https://www.colorhexa.com/e8ecf0.png" width="50"/> |
| sidebarItemTextSelected:           | purple200                       | #b990ff                  | <img src="https://www.colorhexa.com/b990ff.png" width="50"/> |
| sidebarBudgetName:                 | gray300                         | #98a1ae                  | <img src="https://www.colorhexa.com/98a1ae.png" width="50"/> |
| menuBackground:                    | gray700                         | #242733                  | <img src="https://www.colorhexa.com/242733.png" width="50"/> |
| menuItemBackground:                | gray200                         | #bdc5cf                  | <img src="https://www.colorhexa.com/bdc5cf.png" width="50"/> |
| menuItemBackgroundHover:           | gray500                         | #4d5768                  | <img src="https://www.colorhexa.com/4d5768.png" width="50"/> |
| menuItemText:                      | gray100                         | #e8ecf0                  | <img src="https://www.colorhexa.com/e8ecf0.png" width="50"/> |
| menuItemTextHover:                 | gray50                          | #f6f8fa                  | <img src="https://www.colorhexa.com/f6f8fa.png" width="50"/> |
| menuItemTextSelected:              | purple400                       | #9446ed                  | <img src="https://www.colorhexa.com/9446ed.png" width="50"/> |
| menuItemTextHeader:                | purple200                       | #b990ff                  | <img src="https://www.colorhexa.com/b990ff.png" width="50"/> |
| menuBorder:                        | gray800                         | #141520                  | <img src="https://www.colorhexa.com/141520.png" width="50"/> |
| menuBorderHover:                   | purple300                       | #a368fc                  | <img src="https://www.colorhexa.com/a368fc.png" width="50"/> |
| menuKeybindingText:                | purple200                       | #b990ff                  | <img src="https://www.colorhexa.com/b990ff.png" width="50"/> |
| menuAutoCompleteBackground:        | gray600                         | #373b4a                  | <img src="https://www.colorhexa.com/373b4a.png" width="50"/> |
| menuAutoCompleteBackgroundHover:   | gray500                         | #4d5768                  | <img src="https://www.colorhexa.com/4d5768.png" width="50"/> |
| menuAutoCompleteText:              | gray100                         | #e8ecf0                  | <img src="https://www.colorhexa.com/e8ecf0.png" width="50"/> |
| menuAutoCompleteTextHover:         | green900                        | #014d40                  | <img src="https://www.colorhexa.com/014d40.png" width="50"/> |
| menuAutoCompleteTextHeader:        | purple200                       | #b990ff                  | <img src="https://www.colorhexa.com/b990ff.png" width="50"/> |
| menuAutoCompleteItemTextHover:     | gray50                          | #f6f8fa                  | <img src="https://www.colorhexa.com/f6f8fa.png" width="50"/> |
| menuAutoCompleteItemText:          | menuItemText                    | #e8ecf0                  | <img src="https://www.colorhexa.com/e8ecf0.png" width="50"/> |
| modalBackground:                   | gray700                         | #242733                  | <img src="https://www.colorhexa.com/242733.png" width="50"/> |
| modalBorder:                       | gray200                         | #bdc5cf                  | <img src="https://www.colorhexa.com/bdc5cf.png" width="50"/> |
| mobileHeaderBackground:            | gray900                         | #080811                  | <img src="https://www.colorhexa.com/080811.png" width="50"/> |
| mobileHeaderText:                  | purple200                       | #b990ff                  | <img src="https://www.colorhexa.com/b990ff.png" width="50"/> |
| mobileHeaderTextSubdued:           | gray200                         | #bdc5cf                  | <img src="https://www.colorhexa.com/bdc5cf.png" width="50"/> |
| mobileHeaderTextHover:             | rgba(200, 200, 200, .15)        | rgba(200, 200, 200, .15) |                                                              |
| mobilePageBackground:              | gray900                         | #080811                  | <img src="https://www.colorhexa.com/080811.png" width="50"/> |
| mobileNavBackground:               | gray600                         | #373b4a                  | <img src="https://www.colorhexa.com/373b4a.png" width="50"/> |
| mobileNavItem:                     | gray150                         | #d4dae0                  | <img src="https://www.colorhexa.com/d4dae0.png" width="50"/> |
| mobileNavItemSelected:             | purple200                       | #b990ff                  | <img src="https://www.colorhexa.com/b990ff.png" width="50"/> |
| mobileAccountShadow:               | cardShadow                      | #080811                  | <img src="https://www.colorhexa.com/080811.png" width="50"/> |
| mobileAccountText:                 | blue800                         | #0b5fa3                  | <img src="https://www.colorhexa.com/0b5fa3.png" width="50"/> |
| mobileTransactionSelected:         | purple300                       | #a368fc                  | <img src="https://www.colorhexa.com/a368fc.png" width="50"/> |
| mobileViewTheme:                   | mobileHeaderBackground          | #080811                  | <img src="https://www.colorhexa.com/080811.png" width="50"/> |
| mobileConfigServerViewTheme:       | purple500                       | #8719e0                  | <img src="https://www.colorhexa.com/8719e0.png" width="50"/> |
| markdownNormal:                    | purple700                       | #690cb0                  | <img src="https://www.colorhexa.com/690cb0.png" width="50"/> |
| markdownDark:                      | purple500                       | #8719e0                  | <img src="https://www.colorhexa.com/8719e0.png" width="50"/> |
| markdownLight:                     | purple800                       | #580a94                  | <img src="https://www.colorhexa.com/580a94.png" width="50"/> |
| buttonMenuText:                    | gray200                         | #bdc5cf                  | <img src="https://www.colorhexa.com/bdc5cf.png" width="50"/> |
| buttonMenuTextHover:               | buttonMenuText                  | #bdc5cf                  | <img src="https://www.colorhexa.com/bdc5cf.png" width="50"/> |
| buttonMenuBackground:              | gray700                         | #242733                  | <img src="https://www.colorhexa.com/242733.png" width="50"/> |
| buttonMenuBackgroundHover:         | rgba(200, 200, 200, .25)        | rgba(200, 200, 200, .25) |                                                              |
| buttonMenuBorder:                  | gray500                         | #4d5768                  | <img src="https://www.colorhexa.com/4d5768.png" width="50"/> |
| buttonMenuSelectedText:            | green800                        | #0c6b58                  | <img src="https://www.colorhexa.com/0c6b58.png" width="50"/> |
| buttonMenuSelectedTextHover:       | orange800                       | #87540d                  | <img src="https://www.colorhexa.com/87540d.png" width="50"/> |
| buttonMenuSelectedBackground:      | orange200                       | #fcf088                  | <img src="https://www.colorhexa.com/fcf088.png" width="50"/> |
| buttonMenuSelectedBackgroundHover: | gray300                         | #98a1ae                  | <img src="https://www.colorhexa.com/98a1ae.png" width="50"/> |
| buttonMenuSelectedBorder:          | buttonMenuSelectedBackground    | #fcf088                  | <img src="https://www.colorhexa.com/fcf088.png" width="50"/> |
| buttonPrimaryText:                 | white                           | #ffffff                  | <img src="https://www.colorhexa.com/ffffff.png" width="50"/> |
| buttonPrimaryTextHover:            | buttonPrimaryText               | #ffffff                  | <img src="https://www.colorhexa.com/ffffff.png" width="50"/> |
| buttonPrimaryBackground:           | purple300                       | #a368fc                  | <img src="https://www.colorhexa.com/a368fc.png" width="50"/> |
| buttonPrimaryBackgroundHover:      | buttonPrimaryBackground         | #a368fc                  | <img src="https://www.colorhexa.com/a368fc.png" width="50"/> |
| buttonPrimaryBorder:               | buttonPrimaryBackground         | #a368fc                  | <img src="https://www.colorhexa.com/a368fc.png" width="50"/> |
| buttonPrimaryShadow:               | rgba(0, 0, 0, 0.6)              | rgba(0, 0, 0, 0.6)       |                                                              |
| buttonPrimaryDisabledText:         | gray400                         | #747c8b                  | <img src="https://www.colorhexa.com/747c8b.png" width="50"/> |
| buttonPrimaryDisabledBackground:   | gray700                         | #242733                  | <img src="https://www.colorhexa.com/242733.png" width="50"/> |
| buttonPrimaryDisabledBorder:       | buttonPrimaryDisabledBackground | #242733                  | <img src="https://www.colorhexa.com/242733.png" width="50"/> |
| buttonNormalText:                  | gray150                         | #d4dae0                  | <img src="https://www.colorhexa.com/d4dae0.png" width="50"/> |
| buttonNormalTextHover:             | gray150                         | #d4dae0                  | <img src="https://www.colorhexa.com/d4dae0.png" width="50"/> |
| buttonNormalBackground:            | gray600                         | #373b4a                  | <img src="https://www.colorhexa.com/373b4a.png" width="50"/> |
| buttonNormalBackgroundHover:       | gray400                         | #747c8b                  | <img src="https://www.colorhexa.com/747c8b.png" width="50"/> |
| buttonNormalBorder:                | gray300                         | #98a1ae                  | <img src="https://www.colorhexa.com/98a1ae.png" width="50"/> |
| buttonNormalShadow:                | rgba(0, 0, 0, 0.4)              | rgba(0, 0, 0, 0.4)       |                                                              |
| buttonNormalSelectedText:          | white                           | #ffffff                  | <img src="https://www.colorhexa.com/ffffff.png" width="50"/> |
| buttonNormalSelectedBackground:    | purple500                       | #8719e0                  | <img src="https://www.colorhexa.com/8719e0.png" width="50"/> |
| buttonNormalDisabledText:          | gray400                         | #747c8b                  | <img src="https://www.colorhexa.com/747c8b.png" width="50"/> |
| buttonNormalDisabledBackground:    | gray700                         | #242733                  | <img src="https://www.colorhexa.com/242733.png" width="50"/> |
| buttonNormalDisabledBorder:        | gray500                         | #4d5768                  | <img src="https://www.colorhexa.com/4d5768.png" width="50"/> |
| buttonBareText:                    | buttonNormalText                | #d4dae0                  | <img src="https://www.colorhexa.com/d4dae0.png" width="50"/> |
| buttonBareTextHover:               | buttonNormalText                | #d4dae0                  | <img src="https://www.colorhexa.com/d4dae0.png" width="50"/> |
| buttonBareBackground:              | transparent                     | transparent              |                                                              |
| buttonBareBackgroundHover:         | rgba(200, 200, 200, .3)         | rgba(200, 200, 200, .3)  |                                                              |
| buttonBareBackgroundActive:        | rgba(200, 200, 200, .5)         | rgba(200, 200, 200, .5)  |                                                              |
| buttonBareDisabledText:            | buttonNormalDisabledText        | #747c8b                  | <img src="https://www.colorhexa.com/747c8b.png" width="50"/> |
| buttonBareDisabledBackground:      | buttonBareBackground            | transparent              |                                                              |
| calendarText:                      | gray50                          | #f6f8fa                  | <img src="https://www.colorhexa.com/f6f8fa.png" width="50"/> |
| calendarBackground:                | gray700                         | #242733                  | <img src="https://www.colorhexa.com/242733.png" width="50"/> |
| calendarItemText:                  | gray150                         | #d4dae0                  | <img src="https://www.colorhexa.com/d4dae0.png" width="50"/> |
| calendarItemBackground:            | gray500                         | #4d5768                  | <img src="https://www.colorhexa.com/4d5768.png" width="50"/> |
| calendarSelectedBackground:        | buttonNormalSelectedBackground  | #8719e0                  | <img src="https://www.colorhexa.com/8719e0.png" width="50"/> |
| calendarCellBackground:            | navy900                         | #102a43                  | <img src="https://www.colorhexa.com/102a43.png" width="50"/> |
| noticeBackground:                  | green600                        | #199473                  | <img src="https://www.colorhexa.com/199473.png" width="50"/> |
| noticeBackgroundLight:             | green900                        | #014d40                  | <img src="https://www.colorhexa.com/014d40.png" width="50"/> |
| noticeBackgroundDark:              | green400                        | #3ebd93                  | <img src="https://www.colorhexa.com/3ebd93.png" width="50"/> |
| noticeText:                        | green300                        | #65d6ad                  | <img src="https://www.colorhexa.com/65d6ad.png" width="50"/> |
| noticeTextLight:                   | green400                        | #3ebd93                  | <img src="https://www.colorhexa.com/3ebd93.png" width="50"/> |
| noticeTextDark:                    | green150                        | #c6f7e2                  | <img src="https://www.colorhexa.com/c6f7e2.png" width="50"/> |
| noticeTextMenu:                    | green400                        | #3ebd93                  | <img src="https://www.colorhexa.com/3ebd93.png" width="50"/> |
| noticeTextMenuHover:               | green700                        | #147d64                  | <img src="https://www.colorhexa.com/147d64.png" width="50"/> |
| noticeBorder:                      | green800                        | #0c6b58                  | <img src="https://www.colorhexa.com/0c6b58.png" width="50"/> |
| warningBackground:                 | orange800                       | #87540d                  | <img src="https://www.colorhexa.com/87540d.png" width="50"/> |
| warningText:                       | orange200                       | #fcf088                  | <img src="https://www.colorhexa.com/fcf088.png" width="50"/> |
| warningTextLight:                  | orange500                       | #e6bb20                  | <img src="https://www.colorhexa.com/e6bb20.png" width="50"/> |
| warningTextDark:                   | orange100                       | #fffbea                  | <img src="https://www.colorhexa.com/fffbea.png" width="50"/> |
| warningBorder:                     | orange500                       | #e6bb20                  | <img src="https://www.colorhexa.com/e6bb20.png" width="50"/> |
| errorBackground:                   | red800                          | #8a041a                  | <img src="https://www.colorhexa.com/8a041a.png" width="50"/> |
| errorText:                         | red200                          | #ff9b9b                  | <img src="https://www.colorhexa.com/ff9b9b.png" width="50"/> |
| errorTextDark:                     | red150                          | #ffbdbd                  | <img src="https://www.colorhexa.com/ffbdbd.png" width="50"/> |
| errorTextDarker:                   | errorTextDark                   | #ffbdbd                  | <img src="https://www.colorhexa.com/ffbdbd.png" width="50"/> |
| errorTextMenu:                     | red200                          | #ff9b9b                  | <img src="https://www.colorhexa.com/ff9b9b.png" width="50"/> |
| errorBorder:                       | red500                          | #e12d39                  | <img src="https://www.colorhexa.com/e12d39.png" width="50"/> |
| upcomingBackground:                | purple800                       | #580a94                  | <img src="https://www.colorhexa.com/580a94.png" width="50"/> |
| upcomingText:                      | purple200                       | #b990ff                  | <img src="https://www.colorhexa.com/b990ff.png" width="50"/> |
| upcomingBorder:                    | tableBorder                     | #373b4a                  | <img src="https://www.colorhexa.com/373b4a.png" width="50"/> |
| formLabelText:                     | purple150                       | #dac4ff                  | <img src="https://www.colorhexa.com/dac4ff.png" width="50"/> |
| formLabelBackground:               | blue900                         | #034388                  | <img src="https://www.colorhexa.com/034388.png" width="50"/> |
| formInputBackground:               | gray800                         | #141520                  | <img src="https://www.colorhexa.com/141520.png" width="50"/> |
| formInputBackgroundSelected:       | gray700                         | #242733                  | <img src="https://www.colorhexa.com/242733.png" width="50"/> |
| formInputBackgroundSelection:      | purple400                       | #9446ed                  | <img src="https://www.colorhexa.com/9446ed.png" width="50"/> |
| formInputBorder:                   | gray600                         | #373b4a                  | <img src="https://www.colorhexa.com/373b4a.png" width="50"/> |
| formInputTextReadOnlySelection:    | gray800                         | #141520                  | <img src="https://www.colorhexa.com/141520.png" width="50"/> |
| formInputBorderSelected:           | purple300                       | #a368fc                  | <img src="https://www.colorhexa.com/a368fc.png" width="50"/> |
| formInputText:                     | gray150                         | #d4dae0                  | <img src="https://www.colorhexa.com/d4dae0.png" width="50"/> |
| formInputTextSelected:             | black                           | #000000                  | <img src="https://www.colorhexa.com/000000.png" width="50"/> |
| formInputTextPlaceholder:          | gray150                         | #d4dae0                  | <img src="https://www.colorhexa.com/d4dae0.png" width="50"/> |
| formInputTextPlaceholderSelected:  | gray100                         | #e8ecf0                  | <img src="https://www.colorhexa.com/e8ecf0.png" width="50"/> |
| formInputTextSelection:            | gray800                         | #141520                  | <img src="https://www.colorhexa.com/141520.png" width="50"/> |
| formInputShadowSelected:           | purple400                       | #9446ed                  | <img src="https://www.colorhexa.com/9446ed.png" width="50"/> |
| formInputTextHighlight:            | purple200                       | #b990ff                  | <img src="https://www.colorhexa.com/b990ff.png" width="50"/> |
| checkboxText:                      | tableText                       | #d4dae0                  | <img src="https://www.colorhexa.com/d4dae0.png" width="50"/> |
| checkboxBackgroundSelected:        | purple300                       | #a368fc                  | <img src="https://www.colorhexa.com/a368fc.png" width="50"/> |
| checkboxBorderSelected:            | purple300                       | #a368fc                  | <img src="https://www.colorhexa.com/a368fc.png" width="50"/> |
| checkboxShadowSelected:            | purple500                       | #8719e0                  | <img src="https://www.colorhexa.com/8719e0.png" width="50"/> |
| checkboxToggleBackground:          | gray400                         | #747c8b                  | <img src="https://www.colorhexa.com/747c8b.png" width="50"/> |
| checkboxToggleBackgroundSelected:  | purple300                       | #a368fc                  | <img src="https://www.colorhexa.com/a368fc.png" width="50"/> |
| checkboxToggleDisabled:            | gray700                         | #242733                  | <img src="https://www.colorhexa.com/242733.png" width="50"/> |
| pillBackground:                    | gray500                         | #4d5768                  | <img src="https://www.colorhexa.com/4d5768.png" width="50"/> |
| pillBackgroundLight:               | gray900                         | #080811                  | <img src="https://www.colorhexa.com/080811.png" width="50"/> |
| pillText:                          | gray200                         | #bdc5cf                  | <img src="https://www.colorhexa.com/bdc5cf.png" width="50"/> |
| pillTextHighlighted:               | purple200                       | #b990ff                  | <img src="https://www.colorhexa.com/b990ff.png" width="50"/> |
| pillBorder:                        | gray500                         | #4d5768                  | <img src="https://www.colorhexa.com/4d5768.png" width="50"/> |
| pillBorderDark:                    | pillBorder                      | #4d5768                  | <img src="https://www.colorhexa.com/4d5768.png" width="50"/> |
| pillBackgroundSelected:            | purple600                       | #7a0ecc                  | <img src="https://www.colorhexa.com/7a0ecc.png" width="50"/> |
| pillTextSelected:                  | gray150                         | #d4dae0                  | <img src="https://www.colorhexa.com/d4dae0.png" width="50"/> |
| pillBorderSelected:                | purple300                       | #a368fc                  | <img src="https://www.colorhexa.com/a368fc.png" width="50"/> |
| pillTextSubdued:                   | gray500                         | #4d5768                  | <img src="https://www.colorhexa.com/4d5768.png" width="50"/> |
| reportsRed:                        | red300                          | #f86a6a                  | <img src="https://www.colorhexa.com/f86a6a.png" width="50"/> |
| reportsBlue:                       | blue400                         | #40a5f7                  | <img src="https://www.colorhexa.com/40a5f7.png" width="50"/> |
| reportsGreen:                      | green400                        | #3ebd93                  | <img src="https://www.colorhexa.com/3ebd93.png" width="50"/> |
| reportsGray:                       | gray400                         | #747c8b                  | <img src="https://www.colorhexa.com/747c8b.png" width="50"/> |
| reportsLabel:                      | pageText                        | #e8ecf0                  | <img src="https://www.colorhexa.com/e8ecf0.png" width="50"/> |
| reportsInnerLabel:                 | navy800                         | #243b53                  | <img src="https://www.colorhexa.com/243b53.png" width="50"/> |
| reportsNumberPositive:             | numberPositive                  | #65d6ad                  | <img src="https://www.colorhexa.com/65d6ad.png" width="50"/> |
| reportsNumberNegative:             | numberNegative                  | #ff9b9b                  | <img src="https://www.colorhexa.com/ff9b9b.png" width="50"/> |
| reportsNumberNeutral:              | numberNeutral                   | #4d5768                  | <img src="https://www.colorhexa.com/4d5768.png" width="50"/> |
| reportsChartFill:                  | reportsNumberPositive           | #65d6ad                  | <img src="https://www.colorhexa.com/65d6ad.png" width="50"/> |
| noteTagBackground:                 | purple800                       | #580a94                  | <img src="https://www.colorhexa.com/580a94.png" width="50"/> |
| noteTagBackgroundHover:            | purple600                       | #7a0ecc                  | <img src="https://www.colorhexa.com/7a0ecc.png" width="50"/> |
| noteTagDefault:                    | purple700                       | #690cb0                  | <img src="https://www.colorhexa.com/690cb0.png" width="50"/> |
| noteTagText:                       | purple100                       | #f2ebfe                  | <img src="https://www.colorhexa.com/f2ebfe.png" width="50"/> |
| budgetCurrentMonth:                | tableBackground                 | #141520                  | <img src="https://www.colorhexa.com/141520.png" width="50"/> |
| budgetOtherMonth:                  | gray700                         | #242733                  | <img src="https://www.colorhexa.com/242733.png" width="50"/> |
| budgetHeaderCurrentMonth:          | tableHeaderBackground           | #080811                  | <img src="https://www.colorhexa.com/080811.png" width="50"/> |
| budgetHeaderOtherMonth:            | gray800                         | #141520                  | <img src="https://www.colorhexa.com/141520.png" width="50"/> |
| budgetNumberZero:                  | tableTextSubdued                | #4d5768                  | <img src="https://www.colorhexa.com/4d5768.png" width="50"/> |
| budgetNumberNegative:              | numberNegative                  | #ff9b9b                  | <img src="https://www.colorhexa.com/ff9b9b.png" width="50"/> |
| budgetNumberNeutral:               | tableText                       | #d4dae0                  | <img src="https://www.colorhexa.com/d4dae0.png" width="50"/> |
| budgetNumberPositive:              | budgetNumberNeutral             | #d4dae0                  | <img src="https://www.colorhexa.com/d4dae0.png" width="50"/> |
| templateNumberFunded:              | numberPositive                  | #65d6ad                  | <img src="https://www.colorhexa.com/65d6ad.png" width="50"/> |
| templateNumberUnderFunded:         | orange200                       | #fcf088                  | <img src="https://www.colorhexa.com/fcf088.png" width="50"/> |
| toBudgetPositive:                  | numberPositive                  | #65d6ad                  | <img src="https://www.colorhexa.com/65d6ad.png" width="50"/> |
| toBudgetZero:                      | numberPositive                  | #65d6ad                  | <img src="https://www.colorhexa.com/65d6ad.png" width="50"/> |
| toBudgetNegative:                  | budgetNumberNegative            | #ff9b9b                  | <img src="https://www.colorhexa.com/ff9b9b.png" width="50"/> |
| floatingActionBarBackground:       | gray900                         | #080811                  | <img src="https://www.colorhexa.com/080811.png" width="50"/> |
| floatingActionBarBorder:           | purple300                       | #a368fc                  | <img src="https://www.colorhexa.com/a368fc.png" width="50"/> |
| floatingActionBarText:             | purple200                       | #b990ff                  | <img src="https://www.colorhexa.com/b990ff.png" width="50"/> |
| tooltipText:                       | gray100                         | #e8ecf0                  | <img src="https://www.colorhexa.com/e8ecf0.png" width="50"/> |
| tooltipBackground:                 | gray800                         | #141520                  | <img src="https://www.colorhexa.com/141520.png" width="50"/> |
| tooltipBorder:                     | gray600                         | #373b4a                  | <img src="https://www.colorhexa.com/373b4a.png" width="50"/> |
| overlayBackground:                 | rgba(0, 0, 0, 0.3)              | rgba(0, 0, 0, 0.3)       |                                                              |
