// oxlint-disable-next-line eslint/no-restricted-imports
import * as colorPalette from '@desktop-client/style/palette';

// Modern dark theme with improved contrast and polish
// Inspired by Linear, Raycast - clean, high contrast, layered

export const pageBackground = '#0a0a0f';
export const pageBackgroundModalActive = '#12121a';
export const pageBackgroundTopLeft = '#0f0f18';
export const pageBackgroundBottomRight = '#16161f';
export const pageBackgroundLineTop = colorPalette.purple400;
export const pageBackgroundLineMid = '#0d0d14';
export const pageBackgroundLineBottom = colorPalette.navy150;
export const pageText = '#e4e4ed';
export const pageTextLight = '#a0a0b8';
export const pageTextSubdued = '#5c5c72';
export const pageTextDark = '#f0f0f8';
export const pageTextPositive = colorPalette.purple200;
export const pageTextLink = '#a78bfa';
export const pageTextLinkLight = '#c4b5fd';

// Cards - elevated surfaces with subtle depth
export const cardBackground = '#14141e';
export const cardBorder = '#2a2a3a';
export const cardShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';

// Table - improved contrast and row separation
export const tableBackground = '#0e0e16';
export const tableRowBackgroundHover = '#1a1a28';
export const tableText = '#e0e0eb';
export const tableTextLight = tableText;
export const tableTextSubdued = '#6b6b82';
export const tableTextSelected = '#f5f5ff';
export const tableTextHover = '#9090a8';
export const tableTextInactive = '#505068';
export const tableHeaderText = '#8888a0';
export const tableHeaderBackground = '#12121c';
export const tableBorder = '#1e1e2e';
export const tableBorderSelected = '#a78bfa';
export const tableBorderHover = '#7c3aed';
export const tableBorderSeparator = '#2a2a3d';
export const tableRowBackgroundHighlight = '#1f1a30';
export const tableRowBackgroundHighlightText = '#f0f0f8';
export const tableRowHeaderBackground = '#14141f';
export const tableRowHeaderText = '#d0d0e0';

// Sidebar - clean vertical navigation
export const sidebarBackground = '#08080d';
export const sidebarItemBackgroundPending = colorPalette.orange200;
export const sidebarItemBackgroundPositive = colorPalette.green500;
export const sidebarItemBackgroundFailed = colorPalette.red300;
export const sidebarItemAccentSelected = '#a78bfa';
export const sidebarItemBackgroundHover = '#16161f';
export const sidebarItemText = '#9898b0';
export const sidebarItemTextSelected = '#e8e8f0';

// Menu - floating surfaces with depth
export const menuBackground = '#14141e';
export const menuItemBackground = '#14141e';
export const menuItemBackgroundHover = '#1e1e2c';
export const menuItemText = '#d0d0e0';
export const menuItemTextHover = '#f0f0f8';
export const menuItemTextSelected = '#a78bfa';
export const menuItemTextHeader = '#8080a0';
export const menuBorder = '#242434';
export const menuBorderHover = '#a78bfa';
export const menuKeybindingText = '#6b6b88';
export const menuAutoCompleteBackground = '#0c0c12';
export const menuAutoCompleteBackgroundHover = '#1a1a28';
export const menuAutoCompleteText = '#b0b0c8';
export const menuAutoCompleteTextHeader = '#8080a0';
export const menuAutoCompleteItemText = menuItemText;

// Modal - elevated dialog surfaces
export const modalBackground = '#14141e';
export const modalBorder = '#2a2a3a';
export const mobileHeaderBackground = colorPalette.purple800;
export const mobileHeaderText = colorPalette.navy150;
export const mobileHeaderTextSubdued = colorPalette.gray200;
export const mobileHeaderTextHover = 'rgba(200, 200, 200, .15)';
export const mobilePageBackground = colorPalette.navy700;
export const mobileNavBackground = colorPalette.navy800;
export const mobileNavItem = colorPalette.navy150;
export const mobileNavItemSelected = colorPalette.purple400;
export const mobileAccountShadow = cardShadow;
export const mobileAccountText = colorPalette.blue800;
export const mobileTransactionSelected = colorPalette.purple400;

// Mobile view themes (for the top bar)
export const mobileViewTheme = mobileHeaderBackground;
export const mobileConfigServerViewTheme = colorPalette.purple500;

export const markdownNormal = colorPalette.purple700;
export const markdownDark = colorPalette.purple500;
export const markdownLight = colorPalette.purple800;

// Button - refined interactive elements
export const buttonMenuText = '#b8b8d0';
export const buttonMenuTextHover = '#e0e0f0';
export const buttonMenuBackground = 'transparent';
export const buttonMenuBackgroundHover = 'rgba(255, 255, 255, 0.08)';
export const buttonMenuBorder = '#3a3a4d';
export const buttonMenuSelectedText = '#1a1a24';
export const buttonMenuSelectedTextHover = '#1a1a24';
export const buttonMenuSelectedBackground = '#a78bfa';
export const buttonMenuSelectedBackgroundHover = '#8b5cf6';
export const buttonMenuSelectedBorder = buttonMenuSelectedBackground;

export const buttonPrimaryText = '#ffffff';
export const buttonPrimaryTextHover = '#ffffff';
export const buttonPrimaryBackground = '#7c3aed';
export const buttonPrimaryBackgroundHover = '#6d28d9';
export const buttonPrimaryBorder = buttonPrimaryBackground;
export const buttonPrimaryShadow = '0 2px 8px rgba(124, 58, 237, 0.35)';
export const buttonPrimaryDisabledText = '#505068';
export const buttonPrimaryDisabledBackground = '#2a2a3d';
export const buttonPrimaryDisabledBorder = buttonPrimaryDisabledBackground;

export const buttonNormalText = '#d0d0e5';
export const buttonNormalTextHover = '#e8e8f5';
export const buttonNormalBackground = '#18182a';
export const buttonNormalBackgroundHover = '#222236';
export const buttonNormalBorder = '#3a3a50';
export const buttonNormalShadow = '0 1px 3px rgba(0, 0, 0, 0.3)';
export const buttonNormalSelectedText = '#ffffff';
export const buttonNormalSelectedBackground = '#7c3aed';
export const buttonNormalDisabledText = '#505068';
export const buttonNormalDisabledBackground = '#141420';
export const buttonNormalDisabledBorder = '#2a2a3a';

// Calendar
export const calendarText = '#e4e4f0';
export const calendarBackground = '#0a0a12';
export const calendarItemText = '#c8c8dd';
export const calendarItemBackground = '#14141f';
export const calendarSelectedBackground = buttonNormalSelectedBackground;

// Bare button - minimal style
export const buttonBareText = '#b0b0c8';
export const buttonBareTextHover = '#e0e0f0';
export const buttonBareBackground = 'transparent';
export const buttonBareBackgroundHover = 'rgba(255, 255, 255, 0.06)';
export const buttonBareBackgroundActive = 'rgba(255, 255, 255, 0.1)';
export const buttonBareDisabledText = buttonNormalDisabledText;
export const buttonBareDisabledBackground = buttonBareBackground;

// Notice/Warning/Error states - improved visibility
export const noticeBackground = '#0a261f';
export const noticeBackgroundLight = '#0f332a';
export const noticeBackgroundDark = '#147d64';
export const noticeText = '#34d399';
export const noticeTextLight = '#6ee7b7';
export const noticeTextDark = '#a7f3d0';
export const noticeTextMenu = '#34d399';
export const noticeBorder = '#065f46';
export const warningBackground = '#3d2808';
export const warningText = '#fbbf24';
export const warningTextLight = '#fcd34d';
export const warningTextDark = '#fef3c7';
export const warningBorder = '#b45309';
export const errorBackground = '#2a0a10';
export const errorText = '#f87171';
export const errorTextDark = '#fca5a5';
export const errorTextDarker = errorTextDark;
export const errorTextMenu = '#f87171';
export const errorBorder = '#b91c1c';
export const upcomingBackground = '#1a1530';
export const upcomingText = '#c4b5fd';
export const upcomingBorder = tableBorder;

// Form inputs - clean and focused
export const formLabelText = '#9898b0';
export const formLabelBackground = '#14141e';
export const formInputBackground = '#0e0e16';
export const formInputBackgroundSelected = '#18182a';
export const formInputBackgroundSelection = '#7c3aed';
export const formInputBorder = '#2a2a3d';
export const formInputTextReadOnlySelection = '#1a1a28';
export const formInputBorderSelected = '#7c3aed';
export const formInputText = '#e0e0eb';
export const formInputTextSelected = '#0a0a0f';
export const formInputTextPlaceholder = '#5c5c72';
export const formInputTextPlaceholderSelected = '#9898b0';
export const formInputTextSelection = '#1a1a28';
export const formInputShadowSelected = '0 0 0 2px rgba(124, 58, 237, 0.25)';
export const formInputTextHighlight = '#a78bfa';

// Checkbox/Toggle
export const checkboxText = tableText;
export const checkboxBackgroundSelected = '#7c3aed';
export const checkboxBorderSelected = '#7c3aed';
export const checkboxShadowSelected = '0 0 0 2px rgba(124, 58, 237, 0.25)';
export const checkboxToggleBackground = '#2a2a3d';
export const checkboxToggleBackgroundSelected = '#7c3aed';
export const checkboxToggleDisabled = '#3a3a4d';

// Pills/Tags - subtle chips
export const pillBackground = '#1a1a28';
export const pillBackgroundLight = '#14141f';
export const pillText = '#b0b0c8';
export const pillTextHighlighted = '#a78bfa';
export const pillBorder = '#2a2a3d';
export const pillBorderDark = '#242434';
export const pillBackgroundSelected = '#7c3aed';
export const pillTextSelected = '#ffffff';
export const pillBorderSelected = '#7c3aed';
export const pillTextSubdued = '#6b6b82';

// Reports - vibrant data visualization
export const reportsRed = '#f87171';
export const reportsBlue = '#60a5fa';
export const reportsGreen = '#34d399';
export const reportsGray = '#6b7280';
export const reportsLabel = pageText;
export const reportsInnerLabel = '#14141f';

// Note tags
export const noteTagBackground = '#2d1f54';
export const noteTagBackgroundHover = '#3d2970';
export const noteTagDefault = '#2d1f54';
export const noteTagText = '#c4b5fd';

// Budget view
export const budgetOtherMonth = '#08080d';
export const budgetCurrentMonth = tableBackground;
export const budgetHeaderOtherMonth = '#10101a';
export const budgetHeaderCurrentMonth = tableHeaderBackground;

// Floating action bar
export const floatingActionBarBackground = '#1e1a30';
export const floatingActionBarBorder = '#2a2640';
export const floatingActionBarText = '#e4e4f0';

// Tooltip - refined popover
export const tooltipText = '#e0e0eb';
export const tooltipBackground = '#18182a';
export const tooltipBorder = '#2a2a3d';

export const calendarCellBackground = '#0c0c14';
