import * as colorPalette from '../palette';
import * as lightTheme from './light';

const blue900 = '#0093E6';
const blue800 = '#0081CC';
const blue600 = '#006198';
const blue500 = '#00527F';
const blue400 = '#004165';
const blue300 = '#00314C';
const blue200 = '#002134';
const blue150 = '#001826';

const red900 = '#E6DA3F';
const red700 = '#B2A931';
const red500 = '#7F7923';
const red300 = '#4D4915';
const red200 = '#34310E';
const red100 = '#1A1807';

const green900 = '#54B1E5';
const green800 = '#4B9ECC';
const green700 = '#428AB2';
const green500 = '#2F6380';
const green400 = '#254E65';
const green200 = '#132834';
const green150 = '#0E1E27';
const green100 = '#091319';

const orange900 = '#E66600';
const orange800 = '#CD5B00';
const orange700 = '#B34F00';
const orange500 = '#7F3800';
const orange300 = '#4D2200';
const orange200 = '#341700';
const orange150 = '#271100';

const purple700 = '#B24F00';
const purple600 = '#994400';
const purple500 = '#803900';
const purple400 = '#662D00';
const purple300 = '#4C2200';
const purple200 = '#341700';
const purple150 = '#261100';
const purple100 = '#1A0B00';

// const navy900 = '#CC79A7';
// const navy800 = '#CC79A7';
// const navy700 = '#B26A92';
// const navy600 = '#9A5C7E';
// const navy500 = '#804C69';
// const navy400 = '#653C53';
// const navy300 = '#4C2D3F';
// const navy200 = '#341F2A';
// const navy150 = '#271720';
// const navy100 = '#190F14';
// const navy50 = '#0D080A';
const navy900 = colorPalette.navy900;
const navy800 = colorPalette.navy800;
const navy700 = colorPalette.navy700;
const navy600 = colorPalette.navy600;
const navy500 = colorPalette.navy500;
const navy400 = colorPalette.navy400;
const navy300 = colorPalette.navy300;
const navy200 = colorPalette.navy200;
const navy150 = colorPalette.navy150;
const navy100 = colorPalette.navy100;
const navy50 = colorPalette.navy50;

export const pageBackground = navy100;
export const pageBackgroundModalActive = navy200;
export const pageBackgroundTopLeft = navy100;
export const pageBackgroundBottomRight = blue150;
export const pageBackgroundLineTop = lightTheme.pageBackgroundLineTop;
export const pageBackgroundLineMid = navy100;
export const pageBackgroundLineBottom = blue150;
export const pageText = lightTheme.pageText;
export const pageTextLight = navy500;
export const pageTextSubdued = navy300;
export const pageTextDark = navy800;
export const pageTextPositive = purple600;
export const pageTextLink = blue600;
export const pageTextLinkLight = blue300;

export const cardBackground = lightTheme.cardBackground;
export const cardBorder = purple700;
export const cardShadow = navy700;

export const tableBackground = lightTheme.tableBackground;
export const tableRowBackgroundHover = navy50;
export const tableText = lightTheme.tableText;
export const tableTextLight = navy400;
export const tableTextSubdued = navy100;
export const tableTextSelected = navy700;
export const tableTextHover = navy900;
export const tableTextInactive = navy500;
export const tableHeaderText = navy600;
export const tableHeaderBackground = lightTheme.tableHeaderBackground;
export const tableBorder = navy100;
export const tableBorderSelected = purple500;
export const tableBorderHover = purple400;
export const tableBorderSeparator = navy400;
export const tableRowBackgroundHighlight =
  blue150;
export const tableRowBackgroundHighlightText =
  navy700;
export const tableRowHeaderBackground = navy50;
export const tableRowHeaderText = navy800;

export const sidebarBackground = navy900;
export const sidebarItemBackgroundPending =
  orange200;
export const sidebarItemBackgroundPositive =
  green500;
export const sidebarItemBackgroundFailed =
  red300;
export const sidebarItemBackgroundHover = navy800;
export const sidebarItemAccentSelected = purple200;
export const sidebarItemText = navy150;
export const sidebarItemTextSelected = purple200;

export const menuBackground = lightTheme.menuBackground;
export const menuItemBackground = navy50;
export const menuItemBackgroundHover = navy100;
export const menuItemText = navy900;
export const menuItemTextHover = lightTheme.menuItemTextHover;
export const menuItemTextSelected = purple300;
export const menuItemTextHeader = navy400;
export const menuBorder = navy100;
export const menuBorderHover = purple100;
export const menuKeybindingText = navy400;
export const menuAutoCompleteBackground = navy900;
export const menuAutoCompleteBackgroundHover =
  navy600;
export const menuAutoCompleteText = lightTheme.menuAutoCompleteText;
export const menuAutoCompleteTextHover = green150;
export const menuAutoCompleteTextHeader = orange150;
export const menuAutoCompleteItemTextHover =
  lightTheme.menuAutoCompleteItemTextHover;
export const menuAutoCompleteItemText = lightTheme.menuAutoCompleteItemText;

export const modalBackground = lightTheme.modalBackground;
export const modalBorder = lightTheme.modalBorder;
export const mobileHeaderBackground = purple400;
export const mobileHeaderText = navy50;
export const mobileHeaderTextSubdued = lightTheme.mobileHeaderTextSubdued;
export const mobileHeaderTextHover = lightTheme.mobileHeaderTextHover;
export const mobilePageBackground = navy50;
export const mobileNavBackground = lightTheme.mobileNavBackground;
export const mobileNavItem = lightTheme.mobileNavItem;
export const mobileNavItemSelected = purple500;
export const mobileAccountShadow = navy300;
export const mobileAccountText = blue800;

// Mobile view themes (for the top bar)
export const mobileViewTheme = lightTheme.mobileViewTheme;
export const mobileConfigServerViewTheme =
purple500;

export const markdownNormal = purple150;
export const markdownDark = purple400;
export const markdownLight = purple100;

// Button
export const buttonMenuText = navy100;
export const buttonMenuTextHover = navy50;
export const buttonMenuBackground = lightTheme.buttonMenuBackground;
export const buttonMenuBackgroundHover = lightTheme.buttonMenuBackgroundHover;
export const buttonMenuBorder = navy500;
export const buttonMenuSelectedText = green800;
export const buttonMenuSelectedTextHover =
  orange800;
export const buttonMenuSelectedBackground =
  orange200;
export const buttonMenuSelectedBackgroundHover =
  orange300;
export const buttonMenuSelectedBorder = lightTheme.buttonMenuSelectedBorder;

export const buttonPrimaryText = lightTheme.buttonPrimaryText;
export const buttonPrimaryTextHover = lightTheme.buttonPrimaryTextHover;
export const buttonPrimaryBackground = purple500;
export const buttonPrimaryBackgroundHover =
purple300;
export const buttonPrimaryBorder = lightTheme.buttonPrimaryBorder;
export const buttonPrimaryShadow = lightTheme.buttonPrimaryShadow;
export const buttonPrimaryDisabledText = lightTheme.buttonPrimaryDisabledText;
export const buttonPrimaryDisabledBackground =
  navy300;
export const buttonPrimaryDisabledBorder =
  lightTheme.buttonPrimaryDisabledBorder;

export const buttonNormalText = navy900;
export const buttonNormalTextHover = lightTheme.buttonNormalTextHover;
export const buttonNormalBackground = lightTheme.buttonNormalBackground;
export const buttonNormalBackgroundHover =
  lightTheme.buttonNormalBackgroundHover;
export const buttonNormalBorder = navy150;
export const buttonNormalShadow = lightTheme.buttonNormalShadow;
export const buttonNormalSelectedText = lightTheme.buttonNormalSelectedText;
export const buttonNormalSelectedBackground =
  blue600;
export const buttonNormalDisabledText =navy300;
export const buttonNormalDisabledBackground =
  lightTheme.buttonNormalDisabledBackground;
export const buttonNormalDisabledBorder = lightTheme.buttonNormalDisabledBorder;

export const calendarText =navy50;
export const calendarBackground = navy900;
export const calendarItemText = navy150;
export const calendarItemBackground = navy800;
export const calendarSelectedBackground = navy500;

export const buttonBareText = lightTheme.buttonBareText;
export const buttonBareTextHover = lightTheme.buttonBareTextHover;
export const buttonBareBackground = lightTheme.buttonBareBackground;
export const buttonBareBackgroundHover = lightTheme.buttonBareBackgroundHover;
export const buttonBareBackgroundActive = lightTheme.buttonBareBackgroundActive;
export const buttonBareDisabledText = lightTheme.buttonBareDisabledText;
export const buttonBareDisabledBackground =
  lightTheme.buttonBareDisabledBackground;

export const noticeBackground = green150;
export const noticeBackgroundLight = green100;
export const noticeBackgroundDark = green500;
export const noticeText = green700;
export const noticeTextLight = green500;
export const noticeTextDark = green900;
export const noticeTextMenu = green200;
export const noticeBorder = green500;
export const warningBackground = orange200;
export const warningText = orange700;
export const warningTextLight = orange500;
export const warningTextDark = orange900;
export const warningBorder = orange500;
export const errorBackground = red100;
export const errorText = red500;
export const errorTextDark = red700;
export const errorTextDarker = red900;
export const errorTextMenu = red200;
export const errorBorder = red500;
export const upcomingBackground = purple100;
export const upcomingText = purple700;
export const upcomingBorder = purple500;

export const formLabelText = blue600;
export const formLabelBackground = blue200;
export const formInputBackground = navy50;
export const formInputBackgroundSelected =
  lightTheme.formInputBackgroundSelected;
export const formInputBackgroundSelection =
purple500;
export const formInputBorder = navy150;
export const formInputTextReadOnlySelection =
  navy50;
export const formInputBorderSelected = purple500;
export const formInputText = navy900;
export const formInputTextSelected = navy50;
export const formInputTextPlaceholder = navy300;
export const formInputTextPlaceholderSelected =
  navy200;
export const formInputTextSelection = navy100;
export const formInputShadowSelected = purple300;
export const formInputTextHighlight = purple200;
export const checkboxText = lightTheme.checkboxText;
export const checkboxBackgroundSelected = blue500;
export const checkboxBorderSelected = blue500;
export const checkboxShadowSelected = blue300;
export const checkboxToggleBackground = lightTheme.checkboxToggleBackground;

export const pillBackground = navy150;
export const pillBackgroundLight = navy50;
export const pillText = navy800;
export const pillTextHighlighted = purple600;
export const pillBorder = navy150;
export const pillBorderDark = navy300;
export const pillBackgroundSelected = blue150;
export const pillTextSelected = blue900;
export const pillBorderSelected = purple500;
export const pillTextSubdued = navy200;

export const reportsRed = red300;
export const reportsBlue = blue400;
export const reportsGreen = green400;
export const reportsLabel = navy900;
export const reportsInnerLabel = navy800;

export const noteTagBackground = purple100;
export const noteTagBackgroundHover = purple150;
export const noteTagText = purple700;
