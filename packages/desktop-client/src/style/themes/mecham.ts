// Mecham theme — dark navy chrome + blurple accent.
//
// Palette role notes:
//   blurple500 = primary brand / accent (links, primary buttons, selected nav)
//   navy900    = sidebar / deepest surface
//   navy800    = sidebar item / hover surface
//   navy700    = action bar background
//   navy600    = card / table surface
//   navy500    = subtle hover / tooltip
//   navy400    = elevated modal / divider
//
// All colors are inline rather than referencing #style/palette so the
// distinct flavor is visible at a glance and easy to tweak.

// --- inline palette ---
const blurple300 = '#a3acff'; // disabled primary
const blurple400 = '#7583ff'; // links / hover
const blurple500 = '#545bfe'; // brand / primary action
const blurple600 = '#464cd1'; // primary active / pressed
const blurple700 = '#383ca3'; // tertiary / deep
const blurple900 = '#1c1f58'; // sidebar item / table header

const navy900 = '#121330'; // sidebar background
const navy850 = '#15172d'; // page background
const navy800 = '#1b1d48'; // action bar
const navy700 = '#1f2038'; // card / table surface
const navy600 = '#292c6c'; // hover surface
const navy500 = '#3c3e53'; // modal / elevated
const navy400 = '#4f5267'; // border emphasis
const navy300 = '#6e7388'; // subdued text / inactive
const navy200 = '#a8acc4'; // light text / labels
const navy100 = '#cfd2e0'; // very light text
const navy50 = '#e8e9f3'; // primary text on dark
const white = '#ffffff';

const goldHighlight = '#f6c91d'; // warning / payment chip yellow

// State colors — kept softer/desaturated to harmonize with the navy palette
const positiveText = '#5dc973';
const positiveBg = '#1c5e2e';
const negativeText = '#fa6362';
const negativeBg = '#5a1d1d';
const cautionText = '#f6c91d';
const warningBg = '#3d2f0a';

// --- Actual theme keys ---

export const pageBackground = navy850;
export const pageBackgroundModalActive = navy700;
export const pageBackgroundTopLeft = navy800;
export const pageBackgroundBottomRight = navy700;
export const pageBackgroundLineTop = blurple500;
export const pageBackgroundLineMid = navy900;
export const pageBackgroundLineBottom = blurple900;
export const pageText = navy50;
export const pageTextLight = navy200;
export const pageTextSubdued = navy300;
export const pageTextDark = white;
export const pageTextPositive = blurple400;
export const pageTextLink = blurple400;
export const pageTextLinkLight = blurple300;

export const cardBackground = navy700;
export const cardBorder = navy500;
export const cardShadow = 'rgba(0, 0, 0, 0.5)';

export const tableBackground = navy700;
// Subtle blurple-tinted hover band for high-density table rows — picked
// to register without flashing.
export const tableRowBackgroundHover = '#2f3380';
export const tableText = navy50;
export const tableTextLight = navy50;
// Used for $0.00 cells, placeholder labels — bumped from navy300 so values
// remain legible against the dark table background.
export const tableTextSubdued = navy200;
export const tableTextSelected = white;
export const tableTextHover = navy100;
export const tableTextInactive = navy300;
export const tableHeaderText = navy200;
export const tableHeaderBackground = blurple900;
export const tableBorder = navy500;
export const tableBorderSelected = blurple500;
export const tableBorderHover = blurple400;
export const tableBorderSeparator = navy400;
export const tableRowBackgroundHighlight = blurple700;
export const tableRowBackgroundHighlightText = white;
export const tableRowHeaderBackground = blurple900;
export const tableRowHeaderText = navy50;

export const numberPositive = positiveText;
export const numberNegative = negativeText;
export const numberNeutral = navy300;
export const budgetNumberNegative = numberNegative;
export const budgetNumberZero = tableTextSubdued;
export const budgetNumberNeutral = tableText;
export const budgetNumberPositive = budgetNumberNeutral;
export const templateNumberFunded = numberPositive;
export const templateNumberUnderFunded = cautionText;
export const toBudgetPositive = numberPositive;
export const toBudgetZero = numberPositive;
export const toBudgetNegative = budgetNumberNegative;

export const sidebarBackground = navy900;
export const sidebarItemBackgroundPending = warningBg;
export const sidebarItemBackgroundPositive = positiveText;
export const sidebarItemBackgroundFailed = negativeBg;
export const sidebarItemAccentSelected = blurple500;
// Selected nav item rendered with this background — bumped to blurple700 so
// the active screen is unmistakable at a glance.
export const sidebarItemBackgroundHover = blurple700;
export const sidebarItemText = white;
export const sidebarItemTextSelected = white;
export const sidebarBudgetName = navy200;

export const menuBackground = navy700;
export const menuItemBackground = navy700;
export const menuItemBackgroundHover = navy600;
export const menuItemText = navy50;
export const menuItemTextHover = white;
export const menuItemTextSelected = blurple400;
export const menuItemTextHeader = blurple300;
export const menuBorder = navy500;
export const menuBorderHover = blurple500;
export const menuKeybindingText = blurple300;
export const menuAutoCompleteBackground = navy900;
export const menuAutoCompleteBackgroundHover = navy600;
export const menuAutoCompleteText = navy100;
export const menuAutoCompleteTextHeader = blurple300;
export const menuAutoCompleteItemText = menuItemText;

export const modalBackground = navy700;
export const modalBorder = navy500;
export const mobileHeaderBackground = navy800;
export const mobileHeaderText = navy50;
export const mobileHeaderTextSubdued = navy200;
export const mobileHeaderTextHover = 'rgba(255, 255, 255, .15)';
export const mobilePageBackground = navy850;
export const mobileNavBackground = navy900;
export const mobileNavItem = navy50;
export const mobileNavItemSelected = blurple400;
export const mobileAccountShadow = cardShadow;
export const mobileAccountText = navy100;
export const mobileTransactionSelected = blurple500;

export const mobileViewTheme = mobileHeaderBackground;
export const mobileConfigServerViewTheme = blurple700;

export const markdownNormal = blurple700;
export const markdownDark = blurple500;
export const markdownLight = navy600;

// Buttons
export const buttonMenuText = navy100;
export const buttonMenuTextHover = buttonMenuText;
export const buttonMenuBackground = 'transparent';
export const buttonMenuBackgroundHover = 'rgba(255, 255, 255, .15)';
export const buttonMenuBorder = navy400;
export const buttonMenuSelectedText = white;
export const buttonMenuSelectedTextHover = white;
export const buttonMenuSelectedBackground = blurple500;
export const buttonMenuSelectedBackgroundHover = blurple600;
export const buttonMenuSelectedBorder = buttonMenuSelectedBackground;

export const buttonPrimaryText = white;
export const buttonPrimaryTextHover = white;
export const buttonPrimaryBackground = blurple500;
export const buttonPrimaryBackgroundHover = blurple600;
export const buttonPrimaryBorder = buttonPrimaryBackground;
export const buttonPrimaryShadow = 'rgba(0, 0, 0, 0.6)';
export const buttonPrimaryDisabledText = navy300;
export const buttonPrimaryDisabledBackground = blurple300;
export const buttonPrimaryDisabledBorder = buttonPrimaryDisabledBackground;

export const buttonNormalText = navy50;
export const buttonNormalTextHover = white;
export const buttonNormalBackground = navy700;
export const buttonNormalBackgroundHover = navy600;
export const buttonNormalBorder = navy400;
export const buttonNormalShadow = 'rgba(0, 0, 0, 0.4)';
export const buttonNormalSelectedText = white;
export const buttonNormalSelectedBackground = blurple500;
export const buttonNormalDisabledText = navy300;
export const buttonNormalDisabledBackground = navy700;
export const buttonNormalDisabledBorder = navy500;

export const calendarText = white;
export const calendarBackground = navy900;
export const calendarItemText = navy50;
export const calendarItemBackground = navy700;
export const calendarSelectedBackground = blurple500;

export const buttonBareText = buttonNormalText;
export const buttonBareTextHover = white;
export const buttonBareBackground = 'transparent';
export const buttonBareBackgroundHover = 'rgba(255, 255, 255, .12)';
export const buttonBareBackgroundActive = 'rgba(255, 255, 255, .2)';
export const buttonBareDisabledText = navy300;
export const buttonBareDisabledBackground = buttonBareBackground;

// Status messages
export const noticeBackground = positiveBg;
export const noticeBackgroundLight = '#0e3417';
export const noticeBackgroundDark = positiveText;
export const noticeText = positiveText;
export const noticeTextLight = positiveText;
export const noticeTextDark = '#a8e6b6';
export const noticeTextMenu = positiveText;
export const noticeBorder = positiveText;
export const warningBackground = warningBg;
export const warningText = cautionText;
export const warningTextLight = '#f8d871';
export const warningTextDark = '#fce19a';
export const warningBorder = cautionText;
export const errorBackground = negativeBg;
export const errorText = negativeText;
export const errorTextDark = '#ffadad';
export const errorTextDarker = errorTextDark;
export const errorTextMenu = negativeText;
export const errorBorder = negativeText;
export const upcomingBackground = blurple700;
export const upcomingText = navy50;
export const upcomingBorder = tableBorder;

// Forms
export const formLabelText = blurple300;
export const formLabelBackground = navy800;
export const formInputBackground = navy850;
export const formInputBackgroundSelected = navy700;
export const formInputBackgroundSelection = blurple500;
export const formInputBorder = navy500;
export const formInputTextReadOnlySelection = navy700;
export const formInputBorderSelected = blurple500;
export const formInputText = navy50;
export const formInputTextSelected = white;
export const formInputTextPlaceholder = navy300;
export const formInputTextPlaceholderSelected = navy200;
export const formInputTextSelection = navy850;
export const formInputShadowSelected = blurple400;
export const formInputTextHighlight = blurple500;
export const checkboxText = tableText;
export const checkboxBackgroundSelected = blurple500;
export const checkboxBorderSelected = blurple500;
export const checkboxShadowSelected = blurple400;
export const checkboxToggleBackground = navy500;
export const checkboxToggleBackgroundSelected = blurple500;
export const checkboxToggleDisabled = navy400;

// Pills (chips/tags)
export const pillBackground = navy700;
export const pillBackgroundLight = navy900;
export const pillText = navy100;
export const pillTextHighlighted = blurple300;
export const pillBorder = navy500;
export const pillBorderDark = pillBorder;
export const pillBackgroundSelected = blurple700;
export const pillTextSelected = white;
export const pillBorderSelected = blurple500;
export const pillTextSubdued = navy300;

// Reports
export const reportsRed = negativeText;
export const reportsBlue = blurple400;
export const reportsGreen = positiveText;
export const reportsGray = navy300;
export const reportsLabel = pageText;
export const reportsInnerLabel = navy900;
export const reportsNumberPositive = numberPositive;
export const reportsNumberNegative = numberNegative;
export const reportsNumberNeutral = numberNeutral;
export const reportsChartFill = reportsNumberPositive;

// Notes
export const noteTagBackground = blurple700;
export const noteTagBackgroundHover = blurple500;
export const noteTagDefault = blurple700;
export const noteTagText = white;

// Budget
export const budgetOtherMonth = navy900;
export const budgetCurrentMonth = tableBackground;
export const budgetHeaderOtherMonth = navy800;
export const budgetHeaderCurrentMonth = tableHeaderBackground;

export const floatingActionBarBackground = blurple700;
export const floatingActionBarBorder = floatingActionBarBackground;
export const floatingActionBarText = white;

export const tooltipText = white;
export const tooltipBackground = navy800;
export const tooltipBorder = navy600;

export const calendarCellBackground = navy900;

export const overlayBackground = 'rgba(0, 0, 0, 0.5)';

// Chart qualitative palette — derived from blurple + complementary hues
export const chartQual1 = blurple500;
export const chartQual2 = positiveText;
export const chartQual3 = goldHighlight;
export const chartQual4 = negativeText;
export const chartQual5 = blurple300;
export const chartQual6 = '#7fc4cf';
export const chartQual7 = '#c989fa';
export const chartQual8 = '#ff9b6a';
export const chartQual9 = '#5b9bd5';
