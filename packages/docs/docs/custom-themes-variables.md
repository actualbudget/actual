# Theme Variable Reference

This page lists every CSS variable a [custom theme](./custom-themes.md) can set, with the color each one has in the built-in **Light**, **Dark** and **Midnight** themes.

## Accent and Base Colors

Start with these. Many of the variables further down follow them, so a theme can set a few of these and leave the rest alone.

| Variable                     | Used For                                                                                 | Light     | Dark      | Midnight  |
| ---------------------------- | ---------------------------------------------------------------------------------------- | --------- | --------- | --------- |
| `--color-accent`             | The one color a theme sets to restyle primary buttons, links, focus rings and selection. | `#8719e0` | `#9446ed` | `#9446ed` |
| `--color-accentContrast`     | Text and icons on an accent fill.                                                        | `#ffffff` | `#ffffff` | `#ffffff` |
| `--color-accentHover`        | Hovered and pressed accent fill.                                                         | `#7300c3` | `#822fd8` | `#822fd8` |
| `--color-accentText`         | The accent as text or an icon on the page and on tables.                                 | `#8719e0` | `#cbaeff` | `#bb91ff` |
| `--color-accentBorder`       | Selected outlines and focus rings.                                                       | `#8719e0` | `#a45aff` | `#a660ff` |
| `--color-accentSubtle`       | Tinted surface for selected rows and pills.                                              | `#efe7fe` | `#44427c` | `#342553` |
| `--color-accentSubtleText`   | Accent text on the tinted surface.                                                       | `#8719e0` | `#cbaeff` | `#bb91ff` |
| `--color-backgroundPage`     | The page behind cards and tables.                                                        | `#e8ecf0` | `#080811` | `#373b4a` |
| `--color-background`         | Tables and other content surfaces.                                                       | `#ffffff` | `#243b53` | `#141520` |
| `--color-backgroundRaised`   | Menus and tooltips.                                                                      | `#ffffff` | `#243b53` | `#242733` |
| `--color-backgroundHover`    | A hovered row on a content surface.                                                      | `#f7fafc` | `#334e68` | `#4d5768` |
| `--color-backgroundSelected` | A selected row on a content surface.                                                     | `#efe7fe` | `#44427c` | `#342553` |
| `--color-border`             | Lines between table rows.                                                                | `#e8ecf0` | `#486581` | `#373b4a` |
| `--color-text`               | Primary text.                                                                            | `#272630` | `#d9e2ec` | `#e8ecf0` |
| `--color-textSecondary`      | Supporting text such as descriptions and labels.                                         | `#627d98` | `#9fb3c8` | `#bdc5cf` |
| `--color-textTertiary`       | The least prominent text, such as hints.                                                 | `#9fb3c8` | `#829ab1` | `#98a1ae` |

## All Other Variables

The **Follows** column names the variable a color is taken from, or worked out from, when a theme does not set it. Setting the variable in that column changes both.

| Variable                                    | Light       | Dark        | Midnight    | Follows                                                                                   |
| ------------------------------------------- | ----------- | ----------- | ----------- | ----------------------------------------------------------------------------------------- |
| `--color-pageBackground`                    | `#e8ecf0`   | `#080811`   | `#373b4a`   | `--color-backgroundPage`                                                                  |
| `--color-pageBackgroundTopLeft`             | `#e8ecf0`   | `#243b53`   | `#141520`   |                                                                                           |
| `--color-pageBackgroundBottomRight`         | `#b3d9ff`   | `#242733`   | `#242733`   |                                                                                           |
| `--color-pageBackgroundLineTop`             | `#ffffff`   | `#9446ed`   | `#a368fc`   |                                                                                           |
| `--color-pageBackgroundLineMid`             | `#e8ecf0`   | `#102a43`   | `#080811`   |                                                                                           |
| `--color-pageBackgroundLineBottom`          | `#b3d9ff`   | `#d9e2ec`   | `#d4dae0`   |                                                                                           |
| `--color-pageText`                          | `#272630`   | `#d9e2ec`   | `#e8ecf0`   | `--color-text`                                                                            |
| `--color-pageTextLight`                     | `#627d98`   | `#9fb3c8`   | `#bdc5cf`   | `--color-textSecondary`                                                                   |
| `--color-pageTextSubdued`                   | `#9fb3c8`   | `#829ab1`   | `#98a1ae`   | `--color-textTertiary`                                                                    |
| `--color-pageTextDark`                      | `#243b53`   | `#e8ecf0`   | `#e8ecf0`   |                                                                                           |
| `--color-pageTextPositive`                  | `#8719e0`   | `#cbaeff`   | `#bb91ff`   | `--color-accentText`                                                                      |
| `--color-pageTextLink`                      | `#8719e0`   | `#cbaeff`   | `#bb91ff`   | `--color-accentText`                                                                      |
| `--color-pageTextLinkLight`                 | `#8719e0`   | `#cbaeff`   | `#bb91ff`   | `--color-accentText`                                                                      |
| `--color-cardBackground`                    | `#ffffff`   | `#141520`   | `#141520`   |                                                                                           |
| `--color-cardBorder`                        | `#8719e0`   | `#a45aff`   | `#a660ff`   | `--color-accentBorder`                                                                    |
| `--color-cardShadow`                        | `#334e68`   | `#334e68`   | `#080811`   |                                                                                           |
| `--color-tableBackground`                   | `#ffffff`   | `#243b53`   | `#141520`   | `--color-background`                                                                      |
| `--color-tableRowBackgroundAlternate`       | `#ffffff`   | `#243b53`   | `#141520`   | `--color-tableBackground`                                                                 |
| `--color-tableRowBackgroundHover`           | `#f7fafc`   | `#334e68`   | `#4d5768`   | `--color-backgroundHover`                                                                 |
| `--color-tableText`                         | `#272630`   | `#d9e2ec`   | `#e8ecf0`   | `--color-pageText` in Light, `--color-text` in Dark and Midnight                          |
| `--color-tableTextItemAdded`                | `#272630`   | `#d9e2ec`   | `#e8ecf0`   | `--color-tableText`                                                                       |
| `--color-tableTextLight`                    | `#627d98`   | `#d9e2ec`   | `#e8ecf0`   | `--color-tableText` in Dark and Midnight                                                  |
| `--color-tableTextSubdued`                  | `#627d98`   | `#9fb3c8`   | `#98a1ae`   |                                                                                           |
| `--color-tableTextSelected`                 | `#272630`   | `#d9e2ec`   | `#e8ecf0`   | `--color-tableText`                                                                       |
| `--color-tableTextInactive`                 | `#627d98`   | `#829ab1`   | `#98a1ae`   |                                                                                           |
| `--color-tableHeaderText`                   | `#486581`   | `#bcccdc`   | `#bdc5cf`   |                                                                                           |
| `--color-tableHeaderBackground`             | `#ffffff`   | `#334e68`   | `#080811`   |                                                                                           |
| `--color-tableBorder`                       | `#e8ecf0`   | `#486581`   | `#373b4a`   | `--color-border`                                                                          |
| `--color-tableBorderSelected`               | `#8719e0`   | `#a45aff`   | `#a660ff`   | `--color-accentBorder`                                                                    |
| `--color-tableBorderHover`                  | `#8719e0`   | `#a45aff`   | `#a660ff`   | `--color-accentBorder`                                                                    |
| `--color-tableBorderSeparator`              | `#829ab1`   | `#829ab1`   | `#747c8b`   |                                                                                           |
| `--color-tableRowBackgroundHighlight`       | `#efe7fe`   | `#44427c`   | `#342553`   | `--color-backgroundSelected`                                                              |
| `--color-tableRowBackgroundHighlightText`   | `#272630`   | `#d9e2ec`   | `#e8ecf0`   | `--color-tableText`                                                                       |
| `--color-tableRowHeaderBackground`          | `#f7fafc`   | `#334e68`   | `#242733`   |                                                                                           |
| `--color-tableRowHeaderText`                | `#243b53`   | `#d9e2ec`   | `#e8ecf0`   | `--color-text` in Dark and Midnight                                                       |
| `--color-numberPositive`                    | `#147d64`   | `#65d6ad`   | `#65d6ad`   |                                                                                           |
| `--color-numberNegative`                    | `#e12d39`   | `#ff9b9b`   | `#ff9b9b`   |                                                                                           |
| `--color-numberNeutral`                     | `#627d98`   | `#9fb3c8`   | `#98a1ae`   |                                                                                           |
| `--color-budgetNumberNegative`              | `#e12d39`   | `#ff9b9b`   | `#ff9b9b`   | `--color-numberNegative`                                                                  |
| `--color-budgetNumberZero`                  | `#627d98`   | `#9fb3c8`   | `#98a1ae`   | `--color-tableTextSubdued`                                                                |
| `--color-budgetNumberNeutral`               | `#272630`   | `#d9e2ec`   | `#e8ecf0`   | `--color-tableText`                                                                       |
| `--color-budgetNumberPositive`              | `#272630`   | `#d9e2ec`   | `#e8ecf0`   | `--color-budgetNumberNeutral`                                                             |
| `--color-templateNumberFunded`              | `#147d64`   | `#65d6ad`   | `#65d6ad`   | `--color-numberPositive`                                                                  |
| `--color-templateNumberUnderFunded`         | `#b88115`   | `#f5e35d`   | `#fcf088`   |                                                                                           |
| `--color-toBudgetPositive`                  | `#147d64`   | `#65d6ad`   | `#65d6ad`   | `--color-numberPositive`                                                                  |
| `--color-toBudgetZero`                      | `#147d64`   | `#65d6ad`   | `#65d6ad`   | `--color-numberPositive`                                                                  |
| `--color-toBudgetNegative`                  | `#e12d39`   | `#ff9b9b`   | `#ff9b9b`   | `--color-budgetNumberNegative`                                                            |
| `--color-sidebarBackground`                 | `#102a43`   | `#102a43`   | `#080811`   |                                                                                           |
| `--color-sidebarItemBackgroundPending`      | `#fcf088`   | `#fcf088`   | `#fcf088`   |                                                                                           |
| `--color-sidebarItemBackgroundPositive`     | `#27ab83`   | `#27ab83`   | `#3ebd93`   |                                                                                           |
| `--color-sidebarItemBackgroundFailed`       | `#f86a6a`   | `#f86a6a`   | `#f86a6a`   |                                                                                           |
| `--color-sidebarItemBackgroundHover`        | `#243b53`   | `#334e68`   | `#242733`   |                                                                                           |
| `--color-sidebarItemAccentSelected`         | `#c7a2ff`   | `#c5a3ff`   | `#b380ff`   | `--color-accent`, readable on `--color-sidebarBackground`                                 |
| `--color-sidebarItemBackgroundSelected`     | `#c7a2ff38` | `#c5a3ff38` | `#b380ff38` | Mixed from `--color-sidebarItemAccentSelected`                                            |
| `--color-sidebarItemText`                   | `#d9e2ec`   | `#d9e2ec`   | `#e8ecf0`   |                                                                                           |
| `--color-sidebarItemTextUpdated`            | `#d9e2ec`   | `#d9e2ec`   | `#e8ecf0`   | `--color-sidebarItemText`                                                                 |
| `--color-sidebarItemTextSelected`           | `#c7a2ff`   | `#c5a3ff`   | `#b380ff`   | `--color-sidebarItemAccentSelected`                                                       |
| `--color-sidebarBudgetName`                 | `#d9e2ec`   | `#9fb3c8`   | `#98a1ae`   |                                                                                           |
| `--color-sidebarHeaderText`                 | `#ffffff`   | `#ffffff`   | `#e8ecf0`   |                                                                                           |
| `--color-sidebarTextSubdued`                | `#9fb3c8`   | `#9fb3c8`   | `#98a1ae`   |                                                                                           |
| `--color-sidebarTextMuted`                  | `#627d98`   | `#627d98`   | `#4d5768`   |                                                                                           |
| `--color-sidebarTextPositive`               | `#27ab83`   | `#27ab83`   | `#3ebd93`   | `--color-sidebarItemBackgroundPositive`                                                   |
| `--color-sidebarTextFailed`                 | `#f86a6a`   | `#f86a6a`   | `#f86a6a`   | `--color-sidebarItemBackgroundFailed`                                                     |
| `--color-sidebarBackgroundFailedSubtle`     | `#f86a6a29` | `#f86a6a29` | `#f86a6a29` | Mixed from `--color-sidebarItemBackgroundFailed`                                          |
| `--color-sidebarBorder`                     | `#243b53`   | `#334e68`   | `#242733`   | `--color-sidebarItemBackgroundHover`                                                      |
| `--color-sidebarControlBackground`          | `#243b53`   | `#334e68`   | `#242733`   | `--color-sidebarItemBackgroundHover`                                                      |
| `--color-sidebarBrand`                      | `#c7a2ff`   | `#c5a3ff`   | `#b380ff`   | `--color-sidebarItemAccentSelected`                                                       |
| `--color-settingsCardBackground`            | `#ffffff`   | `#243b53`   | `#141520`   | `--color-tableBackground`                                                                 |
| `--color-settingsCardBorder`                | `#e8ecf0`   | `#486581`   | `#373b4a`   | `--color-tableBorder`                                                                     |
| `--color-settingsCardText`                  | `#272630`   | `#d9e2ec`   | `#e8ecf0`   | `--color-tableText`                                                                       |
| `--color-settingsCardTextSubdued`           | `#486581`   | `#9fb3c8`   | `#bdc5cf`   |                                                                                           |
| `--color-settingsNavItemText`               | `#272630`   | `#d9e2ec`   | `#e8ecf0`   | `--color-pageText`                                                                        |
| `--color-settingsNavItemBackgroundHover`    | `#27263014` | `#d9e2ec14` | `#e8ecf014` | Mixed from `--color-settingsNavItemText`                                                  |
| `--color-settingsNavItemAccentSelected`     | `#8719e0`   | `#cbaeff`   | `#bb91ff`   | `--color-accentSubtleText`                                                                |
| `--color-settingsNavItemTextSelected`       | `#8719e0`   | `#cbaeff`   | `#bb91ff`   | `--color-settingsNavItemAccentSelected`                                                   |
| `--color-settingsNavItemBackgroundSelected` | `#efe7fe`   | `#44427c`   | `#342553`   | `--color-accentSubtle`                                                                    |
| `--color-menuBackground`                    | `#ffffff`   | `#243b53`   | `#242733`   | `--color-backgroundRaised`                                                                |
| `--color-menuItemBackgroundHover`           | `#e8ecf0`   | `#486581`   | `#4d5768`   |                                                                                           |
| `--color-menuItemText`                      | `#102a43`   | `#e8ecf0`   | `#e8ecf0`   |                                                                                           |
| `--color-menuItemTextHover`                 | `#102a43`   | `#f7fafc`   | `#f6f8fa`   | `--color-menuItemText` in Light                                                           |
| `--color-menuItemTextSelected`              | `#8719e0`   | `#cbaeff`   | `#bb91ff`   | `--color-accentText`                                                                      |
| `--color-menuItemTextHeader`                | `#8719e0`   | `#b98cff`   | `#ac6eff`   | `--color-accent`, readable on `--color-menuBackground`                                    |
| `--color-menuBorder`                        | `#e8ecf0`   | `#102a43`   | `#141520`   |                                                                                           |
| `--color-menuKeybindingText`                | `#8719e0`   | `#b98cff`   | `#ac6eff`   | `--color-accent`, readable on `--color-menuBackground`                                    |
| `--color-menuAutoCompleteBackground`        | `#102a43`   | `#102a43`   | `#373b4a`   |                                                                                           |
| `--color-menuAutoCompleteBackgroundHover`   | `#486581`   | `#486581`   | `#4d5768`   |                                                                                           |
| `--color-menuAutoCompleteText`              | `#ffffff`   | `#bcccdc`   | `#e8ecf0`   |                                                                                           |
| `--color-menuAutoCompleteTextHover`         | `#c6f7e2`   | `#c6f7e2`   | `#c6f7e2`   |                                                                                           |
| `--color-menuAutoCompleteTextHeader`        | `#c7a2ff`   | `#c5a3ff`   | `#d9c5ff`   | `--color-accent`, readable on `--color-menuAutoCompleteBackground`                        |
| `--color-menuAutoCompleteItemTextHover`     | `#ffffff`   | `#f7fafc`   | `#f6f8fa`   | `--color-menuAutoCompleteText` in Light                                                   |
| `--color-menuAutoCompleteItemText`          | `#ffffff`   | `#e8ecf0`   | `#e8ecf0`   | `--color-menuAutoCompleteText` in Light, `--color-menuItemText` in Dark and Midnight      |
| `--color-modalBackground`                   | `#ffffff`   | `#141520`   | `#242733`   |                                                                                           |
| `--color-modalBorder`                       | `#ffffff`   | `#486581`   | `#bdc5cf`   |                                                                                           |
| `--color-mobileHeaderBackground`            | `#8719e0`   | `#9446ed`   | `#9446ed`   | `--color-accent`                                                                          |
| `--color-mobileHeaderText`                  | `#ffffff`   | `#ffffff`   | `#ffffff`   | `--color-accentContrast`                                                                  |
| `--color-mobileHeaderTextSubdued`           | `#ffffffbf` | `#ffffffbf` | `#ffffffbf` | Mixed from `--color-mobileHeaderText`                                                     |
| `--color-mobileHeaderTextHover`             | `#c8c8c826` | `#c8c8c826` | `#c8c8c826` |                                                                                           |
| `--color-mobilePageBackground`              | `#f7fafc`   | `#334e68`   | `#080811`   |                                                                                           |
| `--color-mobileNavBackground`               | `#ffffff`   | `#243b53`   | `#373b4a`   |                                                                                           |
| `--color-mobileNavItem`                     | `#4d5768`   | `#d9e2ec`   | `#d4dae0`   |                                                                                           |
| `--color-mobileNavItemSelected`             | `#8719e0`   | `#cbaeff`   | `#bb91ff`   | `--color-accentText`                                                                      |
| `--color-mobileAccountText`                 | `#0b5fa3`   | `#0b5fa3`   | `#0b5fa3`   |                                                                                           |
| `--color-mobileTransactionSelected`         | `#8719e0`   | `#a45aff`   | `#a660ff`   | `--color-accentBorder`                                                                    |
| `--color-mobileViewTheme`                   | `#8719e0`   | `#9446ed`   | `#9446ed`   | `--color-mobileHeaderBackground`                                                          |
| `--color-mobileConfigServerViewTheme`       | `#8719e0`   | `#9446ed`   | `#9446ed`   | `--color-accent`                                                                          |
| `--color-markdownNormal`                    | `#8719e04d` | `#9446ed4d` | `#9446ed4d` | Mixed from `--color-accent`                                                               |
| `--color-markdownDark`                      | `#8719e0`   | `#a45aff`   | `#a660ff`   | `--color-accentBorder`                                                                    |
| `--color-markdownLight`                     | `#efe7fe`   | `#44427c`   | `#342553`   | `--color-accentSubtle`                                                                    |
| `--color-buttonMenuText`                    | `#e8ecf0`   | `#bcccdc`   | `#bdc5cf`   |                                                                                           |
| `--color-buttonMenuTextHover`               | `#f7fafc`   | `#bcccdc`   | `#bdc5cf`   | `--color-buttonMenuText` in Dark and Midnight                                             |
| `--color-buttonMenuBackground`              | `#00000000` | `#00000000` | `#242733`   |                                                                                           |
| `--color-buttonMenuBackgroundHover`         | `#c8c8c840` | `#c8c8c840` | `#c8c8c840` |                                                                                           |
| `--color-buttonMenuBorder`                  | `#627d98`   | `#627d98`   | `#4d5768`   |                                                                                           |
| `--color-buttonMenuSelectedText`            | `#0c6b58`   | `#0c6b58`   | `#0c6b58`   |                                                                                           |
| `--color-buttonMenuSelectedTextHover`       | `#87540d`   | `#87540d`   | `#87540d`   |                                                                                           |
| `--color-buttonMenuSelectedBackground`      | `#fcf088`   | `#fcf088`   | `#fcf088`   |                                                                                           |
| `--color-buttonMenuSelectedBackgroundHover` | `#f5e35d`   | `#f5e35d`   | `#98a1ae`   |                                                                                           |
| `--color-buttonMenuSelectedBorder`          | `#fcf088`   | `#fcf088`   | `#fcf088`   | `--color-buttonMenuSelectedBackground`                                                    |
| `--color-buttonPrimaryText`                 | `#ffffff`   | `#ffffff`   | `#ffffff`   | `--color-accentContrast`                                                                  |
| `--color-buttonPrimaryTextHover`            | `#ffffff`   | `#ffffff`   | `#ffffff`   | `--color-buttonPrimaryText`                                                               |
| `--color-buttonPrimaryBackground`           | `#8719e0`   | `#9446ed`   | `#9446ed`   | `--color-accent`                                                                          |
| `--color-buttonPrimaryBackgroundHover`      | `#7300c3`   | `#822fd8`   | `#822fd8`   | `--color-accentHover`                                                                     |
| `--color-buttonPrimaryBorder`               | `#8719e0`   | `#9446ed`   | `#9446ed`   | `--color-buttonPrimaryBackground`                                                         |
| `--color-buttonPrimaryShadow`               | `#0000004d` | `#00000099` | `#00000099` |                                                                                           |
| `--color-buttonPrimaryDisabledText`         | `#ffffff`   | `#334e68`   | `#747c8b`   |                                                                                           |
| `--color-buttonPrimaryDisabledBackground`   | `#9fb3c8`   | `#829ab1`   | `#242733`   |                                                                                           |
| `--color-buttonPrimaryDisabledBorder`       | `#9fb3c8`   | `#829ab1`   | `#242733`   | `--color-buttonPrimaryDisabledBackground`                                                 |
| `--color-buttonNormalText`                  | `#102a43`   | `#d9e2ec`   | `#d4dae0`   |                                                                                           |
| `--color-buttonNormalTextHover`             | `#102a43`   | `#d9e2ec`   | `#d4dae0`   | `--color-buttonNormalText` in Light                                                       |
| `--color-buttonNormalBackground`            | `#ffffff`   | `#243b53`   | `#373b4a`   |                                                                                           |
| `--color-buttonNormalBackgroundHover`       | `#ffffff`   | `#486581`   | `#4d5768`   | `--color-buttonNormalBackground` in Light                                                 |
| `--color-buttonNormalBorder`                | `#d9e2ec`   | `#9fb3c8`   | `#98a1ae`   |                                                                                           |
| `--color-buttonNormalShadow`                | `#00000033` | `#00000066` | `#00000066` |                                                                                           |
| `--color-buttonNormalSelectedText`          | `#ffffff`   | `#ffffff`   | `#ffffff`   | `--color-accentContrast`                                                                  |
| `--color-buttonNormalSelectedBackground`    | `#8719e0`   | `#9446ed`   | `#9446ed`   | `--color-accent`                                                                          |
| `--color-buttonNormalDisabledText`          | `#9fb3c8`   | `#627d98`   | `#747c8b`   |                                                                                           |
| `--color-buttonNormalDisabledBackground`    | `#ffffff`   | `#243b53`   | `#242733`   | `--color-buttonNormalBackground` in Light                                                 |
| `--color-buttonNormalDisabledBorder`        | `#d9e2ec`   | `#627d98`   | `#4d5768`   | `--color-buttonNormalBorder` in Light                                                     |
| `--color-calendarText`                      | `#f7fafc`   | `#f7fafc`   | `#f6f8fa`   |                                                                                           |
| `--color-calendarBackground`                | `#102a43`   | `#102a43`   | `#242733`   |                                                                                           |
| `--color-calendarItemText`                  | `#ffffff`   | `#ffffff`   | `#ffffff`   |                                                                                           |
| `--color-calendarItemBackground`            | `#243b53`   | `#243b53`   | `#4d5768`   |                                                                                           |
| `--color-calendarSelectedBackground`        | `#8719e0`   | `#9446ed`   | `#9446ed`   | `--color-accent`                                                                          |
| `--color-calendarSelectedText`              | `#ffffff`   | `#ffffff`   | `#ffffff`   | Black or white on `--color-calendarSelectedBackground` over `--color-calendarBackground`  |
| `--color-datePickerRangeBackground`         | `#efe7fe`   | `#44427c`   | `#342553`   | `--color-accentSubtle`                                                                    |
| `--color-buttonBareText`                    | `#272630`   | `#d9e2ec`   | `#e8ecf0`   | `--color-pageText`                                                                        |
| `--color-buttonBareTextHover`               | `#272630`   | `#d9e2ec`   | `#e8ecf0`   | `--color-pageText`                                                                        |
| `--color-buttonBareDisabledText`            | `#9fb3c8`   | `#627d98`   | `#747c8b`   | `--color-pageTextSubdued` in Light                                                        |
| `--color-buttonBareBackground`              | `#00000000` | `#00000000` | `#00000000` |                                                                                           |
| `--color-buttonBareDisabledBackground`      | `#00000000` | `#00000000` | `#00000000` | `--color-buttonBareBackground`                                                            |
| `--color-buttonBareBackgroundHover`         | `#64646426` | `#c8c8c84d` | `#c8c8c84d` |                                                                                           |
| `--color-buttonBareBackgroundActive`        | `#64646440` | `#c8c8c880` | `#c8c8c880` |                                                                                           |
| `--color-noticeBackground`                  | `#c6f7e2`   | `#0c6b58`   | `#0c6b58`   |                                                                                           |
| `--color-noticeBackgroundLight`             | `#effcf6`   | `#014d40`   | `#014d40`   |                                                                                           |
| `--color-noticeText`                        | `#0c6b58`   | `#8eedc7`   | `#8eedc7`   |                                                                                           |
| `--color-noticeTextLight`                   | `#147d64`   | `#3ebd93`   | `#3ebd93`   |                                                                                           |
| `--color-noticeTextDark`                    | `#014d40`   | `#c6f7e2`   | `#c6f7e2`   |                                                                                           |
| `--color-noticeTextMenu`                    | `#8eedc7`   | `#27ab83`   | `#3ebd93`   |                                                                                           |
| `--color-noticeBorder`                      | `#27ab83`   | `#0c6b58`   | `#0c6b58`   |                                                                                           |
| `--color-warningBackground`                 | `#fcf088`   | `#87540d`   | `#87540d`   |                                                                                           |
| `--color-warningText`                       | `#87540d`   | `#f5e35d`   | `#fcf088`   |                                                                                           |
| `--color-warningTextDark`                   | `#733309`   | `#fffbea`   | `#fffbea`   |                                                                                           |
| `--color-warningBorder`                     | `#e6bb20`   | `#e6bb20`   | `#e6bb20`   |                                                                                           |
| `--color-errorBackground`                   | `#ffe3e3`   | `#8a041a`   | `#8a041a`   |                                                                                           |
| `--color-errorText`                         | `#cf1124`   | `#ff9b9b`   | `#ff9b9b`   |                                                                                           |
| `--color-errorTextDark`                     | `#ab091e`   | `#ffbdbd`   | `#ffbdbd`   |                                                                                           |
| `--color-errorTextDarker`                   | `#610316`   | `#ffbdbd`   | `#ffbdbd`   | `--color-errorTextDark` in Dark and Midnight                                              |
| `--color-errorTextMenu`                     | `#ff9b9b`   | `#ff9b9b`   | `#ff9b9b`   |                                                                                           |
| `--color-errorBorder`                       | `#e12d39`   | `#e12d39`   | `#e12d39`   |                                                                                           |
| `--color-upcomingBackground`                | `#efe7fe`   | `#44427c`   | `#342553`   | `--color-accentSubtle`                                                                    |
| `--color-upcomingText`                      | `#8719e0`   | `#cbaeff`   | `#bb91ff`   | `--color-accentSubtleText`                                                                |
| `--color-formLabelText`                     | `#8719e0`   | `#cbaeff`   | `#bb91ff`   | `--color-accentText`                                                                      |
| `--color-formLabelBackground`               | `#ffffff`   | `#243b53`   | `#141520`   | `--color-tableBackground`                                                                 |
| `--color-formInputBackground`               | `#f7fafc`   | `#243b53`   | `#141520`   |                                                                                           |
| `--color-formInputBackgroundSelected`       | `#ffffff`   | `#334e68`   | `#242733`   |                                                                                           |
| `--color-formInputBackgroundSelection`      | `#8719e0`   | `#9446ed`   | `#9446ed`   | `--color-accent`                                                                          |
| `--color-formInputBorder`                   | `#d9e2ec`   | `#486581`   | `#373b4a`   |                                                                                           |
| `--color-formInputTextReadOnlySelection`    | `#f7fafc`   | `#243b53`   | `#141520`   |                                                                                           |
| `--color-formInputBorderSelected`           | `#8719e0`   | `#a45aff`   | `#a660ff`   | `--color-accentBorder`                                                                    |
| `--color-formInputText`                     | `#102a43`   | `#d9e2ec`   | `#d4dae0`   |                                                                                           |
| `--color-formInputTextPlaceholder`          | `#9fb3c8`   | `#d9e2ec`   | `#d4dae0`   |                                                                                           |
| `--color-formInputTextPlaceholderSelected`  | `#bcccdc`   | `#e8ecf0`   | `#e8ecf0`   |                                                                                           |
| `--color-formInputShadowSelected`           | `#8719e0`   | `#a45aff`   | `#a660ff`   | `--color-accentBorder`                                                                    |
| `--color-formInputTextHighlight`            | `#8719e0`   | `#cbaeff`   | `#bb91ff`   | `--color-accentText`                                                                      |
| `--color-checkboxText`                      | `#ffffff`   | `#ffffff`   | `#ffffff`   | `--color-accentContrast`                                                                  |
| `--color-checkboxBackgroundSelected`        | `#8719e0`   | `#9446ed`   | `#9446ed`   | `--color-accent`                                                                          |
| `--color-checkboxBorderSelected`            | `#8719e0`   | `#9446ed`   | `#9446ed`   | `--color-accent`                                                                          |
| `--color-checkboxShadowSelected`            | `#8719e0`   | `#a45aff`   | `#a660ff`   | `--color-accentBorder`                                                                    |
| `--color-checkboxToggleBackground`          | `#747c8b`   | `#242733`   | `#747c8b`   |                                                                                           |
| `--color-checkboxToggleBackgroundSelected`  | `#8719e0`   | `#9446ed`   | `#9446ed`   | `--color-accent`                                                                          |
| `--color-checkboxToggleDisabled`            | `#bdc5cf`   | `#747c8b`   | `#242733`   |                                                                                           |
| `--color-pillBackground`                    | `#d9e2ec`   | `#243b53`   | `#4d5768`   |                                                                                           |
| `--color-pillBackgroundLight`               | `#f7fafc`   | `#102a43`   | `#080811`   |                                                                                           |
| `--color-pillText`                          | `#243b53`   | `#bcccdc`   | `#d4dae0`   |                                                                                           |
| `--color-pillTextHighlighted`               | `#7d00d3`   | `#c5a3ff`   | `#b380ff`   | `--color-accent`, readable on `--color-pillBackgroundLight`                               |
| `--color-pillBorder`                        | `#d9e2ec`   | `#334e68`   | `#4d5768`   |                                                                                           |
| `--color-pillBorderDark`                    | `#9fb3c8`   | `#334e68`   | `#4d5768`   | `--color-pillBorder` in Dark and Midnight                                                 |
| `--color-pillBackgroundSelected`            | `#efe7fe`   | `#44427c`   | `#342553`   | `--color-accentSubtle`                                                                    |
| `--color-pillTextSelected`                  | `#8719e0`   | `#cbaeff`   | `#bb91ff`   | `--color-accentSubtleText`                                                                |
| `--color-pillBorderSelected`                | `#8719e0`   | `#a45aff`   | `#a660ff`   | `--color-accentBorder`                                                                    |
| `--color-reportsRed`                        | `#f86a6a`   | `#f86a6a`   | `#f86a6a`   |                                                                                           |
| `--color-reportsBlue`                       | `#40a5f7`   | `#40a5f7`   | `#40a5f7`   |                                                                                           |
| `--color-reportsGreen`                      | `#3ebd93`   | `#3ebd93`   | `#3ebd93`   |                                                                                           |
| `--color-reportsGray`                       | `#747c8b`   | `#747c8b`   | `#747c8b`   |                                                                                           |
| `--color-reportsLabel`                      | `#102a43`   | `#d9e2ec`   | `#e8ecf0`   | `--color-pageText` in Dark and Midnight                                                   |
| `--color-reportsInnerLabel`                 | `#243b53`   | `#243b53`   | `#243b53`   |                                                                                           |
| `--color-reportsNumberPositive`             | `#147d64`   | `#65d6ad`   | `#65d6ad`   | `--color-numberPositive`                                                                  |
| `--color-reportsNumberNegative`             | `#e12d39`   | `#ff9b9b`   | `#ff9b9b`   | `--color-numberNegative`                                                                  |
| `--color-reportsNumberNeutral`              | `#627d98`   | `#9fb3c8`   | `#98a1ae`   | `--color-numberNeutral`                                                                   |
| `--color-reportsChartFill`                  | `#147d64`   | `#65d6ad`   | `#65d6ad`   | `--color-reportsNumberPositive`                                                           |
| `--color-noteTagBackground`                 | `#efe7fe`   | `#44427c`   | `#342553`   | `--color-accentSubtle`                                                                    |
| `--color-noteTagBackgroundHover`            | `#f7f3ff`   | `#343f68`   | `#241d3a`   | Mixed from `--color-accentSubtle` and `--color-tableBackground`                           |
| `--color-noteTagText`                       | `#8719e0`   | `#cbaeff`   | `#bb91ff`   | `--color-accentSubtleText`                                                                |
| `--color-budgetCurrentMonth`                | `#ffffff`   | `#243b53`   | `#141520`   | `--color-tableBackground`                                                                 |
| `--color-budgetOtherMonth`                  | `#f6f8fa`   | `#102a43`   | `#242733`   |                                                                                           |
| `--color-budgetHeaderCurrentMonth`          | `#f6f8fa`   | `#334e68`   | `#080811`   | `--color-budgetOtherMonth` in Light, `--color-tableHeaderBackground` in Dark and Midnight |
| `--color-budgetHeaderOtherMonth`            | `#f0f4f6`   | `#243b53`   | `#141520`   |                                                                                           |
| `--color-floatingActionBarBackground`       | `#8719e0`   | `#9446ed`   | `#9446ed`   | `--color-accent`                                                                          |
| `--color-floatingActionBarBorder`           | `#8719e0`   | `#9446ed`   | `#9446ed`   | `--color-floatingActionBarBackground`                                                     |
| `--color-floatingActionBarText`             | `#ffffff`   | `#ffffff`   | `#ffffff`   | `--color-accentContrast`                                                                  |
| `--color-tooltipText`                       | `#102a43`   | `#e8ecf0`   | `#e8ecf0`   |                                                                                           |
| `--color-tooltipBackground`                 | `#ffffff`   | `#243b53`   | `#242733`   | `--color-backgroundRaised`                                                                |
| `--color-tooltipBorder`                     | `#d9e2ec`   | `#334e68`   | `#373b4a`   |                                                                                           |
| `--color-calendarCellBackground`            | `#e8ecf0`   | `#102a43`   | `#102a43`   |                                                                                           |
| `--color-overlayBackground`                 | `#0000004d` | `#0000004d` | `#0000004d` |                                                                                           |
| `--color-chartQual1`                        | `#45b29d`   | `#45b29d`   | `#45b29d`   |                                                                                           |
| `--color-chartQual2`                        | `#efc94c`   | `#efc94c`   | `#efc94c`   |                                                                                           |
| `--color-chartQual3`                        | `#e27a3f`   | `#e27a3f`   | `#e27a3f`   |                                                                                           |
| `--color-chartQual4`                        | `#df5a49`   | `#df5a49`   | `#df5a49`   |                                                                                           |
| `--color-chartQual5`                        | `#5f91b8`   | `#5f91b8`   | `#5f91b8`   |                                                                                           |
| `--color-chartQual6`                        | `#e2a37f`   | `#e2a37f`   | `#e2a37f`   |                                                                                           |
| `--color-chartQual7`                        | `#55dbc1`   | `#55dbc1`   | `#55dbc1`   |                                                                                           |
| `--color-chartQual8`                        | `#efda97`   | `#efda97`   | `#efda97`   |                                                                                           |
| `--color-chartQual9`                        | `#df948a`   | `#df948a`   | `#df948a`   |                                                                                           |

_This page is generated from the theme source in `packages/component-library/src/themes/source/colors.ts`._
