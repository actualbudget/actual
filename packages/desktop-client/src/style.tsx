import type { CSSProperties } from 'glamor';
import { keyframes } from 'glamor';

import * as Platform from 'loot-core/src/client/platform';
import { isNonProductionEnvironment } from 'loot-core/src/shared/environment';

import tokens from './tokens';

// Only for use in contextual color definitions
const colorPalette = {
  gray50: '#f6f8fa',
  gray100: '#e8ecf0',
  gray150: '#d4dae0',
  gray200: '#bdc5cf',
  gray300: '#98a1ae',
  gray400: '#747c8b',
  gray500: '#4d5768',
  gray600: '#373b4a',
  gray700: '#242733',
  gray800: '#141520',
  gray900: '#080811',
  navy50: '#f2f8fd',
  navy100: '#e3effb',
  navy150: '#ccdcf2',
  navy200: '#a9c8e7',
  navy300: '#7eacdb',
  navy400: '#5694cf',
  navy500: '#3677b3',
  navy600: '#206094',
  navy700: '#1a476c',
  navy800: '#102a43',
  navy900: '#081c2e',
  green50: '#f2f9eb',
  green100: '#cff7d7',
  green150: '#98e9c3',
  green200: '#5fdda3',
  green300: '#2cc090',
  green400: '#1aa47c',
  green500: '#0f8162',
  green600: '#186b55',
  green700: '#0e5243',
  green800: '#09392c',
  green900: '#05210e',
  orange50: '#fbf8e9',
  orange100: '#faedc0',
  orange150: '#fcd579',
  orange200: '#fcbd3a',
  orange300: '#ff8f0e',
  orange400: '#ed6704',
  orange500: '#c84801',
  orange600: '#a82c00',
  orange700: '#842106',
  orange800: '#5f1a05',
  orange900: '#331302',
  red50: '#fff5fa',
  red100: '#ffe7f2',
  red150: '#ffccdf',
  red200: '#ffb1cd',
  red300: '#fe87a1',
  red400: '#fc5266',
  red500: '#e20b39',
  red600: '#b40b2e',
  red700: '#8b0e23',
  red800: '#6a0617',
  red900: '#3f0210',
  purple50: '#faf7fe',
  purple100: '#f4ebfe',
  purple150: '#e1d1f9',
  purple200: '#ceb3f1',
  purple300: '#c099f1',
  purple400: '#ac73eb',
  purple500: '#9751dc',
  purple600: '#8126ca',
  purple700: '#67179c',
  purple800: '#4f127e',
  purple900: '#380758',
  white: '#fafafa',
  black: '#0a0a0a',
};

// Contextual colors, only pull from the pallet
const colorsDark = {
  pageBackground: colorPalette.gray900,
  pageBackgroundModalActive: colorPalette.gray800,
  pageBackgroundTopLeft: colorPalette.gray900,
  pageBackgroundBottomRight: colorPalette.gray700,
  pageBackgroundLineTop: colorPalette.purple400,
  pageBackgroundLineMid: colorPalette.gray900,
  pageBackgroundLineBottom: colorPalette.gray150,
  pageText: colorPalette.gray150,
  pageTextSubdued: colorPalette.gray500,
  pageTextPositive: colorPalette.purple400,
  pageTextLink: colorPalette.purple400,
  modalBackground: colorPalette.gray800,
  modalBorder: colorPalette.gray600,
  cardBackground: colorPalette.gray800,
  cardBorder: colorPalette.purple400,
  cardShadow: colorPalette.gray700,
  tableBackground: colorPalette.gray800,
  tableRowBackgroundHover: colorPalette.gray700,
  tableText: colorPalette.gray150,
  tableTextSelected: colorPalette.gray150,
  tableTextHover: colorPalette.gray400,
  tableTextEditing: colorPalette.black,
  tableTextEditingBackground: colorPalette.purple400,
  tableTextInactive: colorPalette.gray500,
  tableHeaderText: colorPalette.gray300,
  tableHeaderBackground: colorPalette.gray700,
  tableBorder: colorPalette.gray600,
  tableBorderSelected: colorPalette.purple400,
  tableBorderHover: colorPalette.purple300,
  tableBorderSeparator: colorPalette.gray400,
  tableRowBackgroundHighlight: colorPalette.purple800,
  tableRowBackgroundHighlightText: colorPalette.gray150,
  tableRowHeaderBackground: colorPalette.gray700,
  tableRowHeaderText: colorPalette.gray150,
  sidebarBackground: colorPalette.gray800,
  sidebarItemBackground: colorPalette.gray800,
  sidebarItemBackgroundSelected: colorPalette.gray800,
  sidebarItemBackgroundHover: colorPalette.gray700,
  sidebarItemAccent: colorPalette.gray800,
  sidebarItemAccentSelected: colorPalette.purple400,
  sidebarItemAccentHover: colorPalette.gray700,
  sidebarItemText: colorPalette.gray150,
  sidebarItemTextSelected: colorPalette.purple400,
  sidebarItemTextHover: colorPalette.gray150,
  tooltipBackground: colorPalette.gray600,
  tooltipBorder: colorPalette.gray500,
  menuBackground: colorPalette.gray600,
  menuItemBackground: colorPalette.gray600,
  menuItemBackgroundHover: colorPalette.gray500,
  menuItemText: colorPalette.gray100,
  menuItemTextHover: colorPalette.gray50,
  menuItemTextSelected: colorPalette.gray200,
  menuItemTextHeader: colorPalette.purple400,
  menuBorder: colorPalette.gray800,
  menuBorderHover: colorPalette.purple400,
  altMenuBackground: colorPalette.gray700,
  altMenuItemBackground: colorPalette.gray700,
  altMenuItemBackgroundHover: colorPalette.gray600,
  altMenuItemText: colorPalette.gray150,
  altMenuItemTextHover: colorPalette.gray150,
  altMenuItemTextSelected: colorPalette.gray150,
  altMenuItemTextHeader: colorPalette.purple500,
  altMenuBorder: colorPalette.gray200,
  altMenuBorderHover: colorPalette.purple400,
  buttonAltMenuText: colorPalette.gray150,
  buttonAltMenuTextHover: colorPalette.gray100,
  buttonAltMenuTextSelected: colorPalette.gray100,
  buttonAltMenuBackground: colorPalette.gray800,
  buttonAltMenuBackgroundHover: colorPalette.gray600,
  buttonAltMenuBorder: colorPalette.gray600,
  buttonPositiveText: colorPalette.black,
  buttonPositiveTextHover: colorPalette.gray150,
  buttonPositiveTextSelected: colorPalette.black,
  buttonPositiveBackground: colorPalette.purple400,
  buttonPositiveBackgroundHover: colorPalette.gray800,
  buttonPositiveBorder: colorPalette.purple400,
  buttonNeutralText: colorPalette.gray150,
  buttonNeutralTextHover: colorPalette.gray150,
  buttonNeutralBackground: colorPalette.gray800,
  buttonNeutralBackgroundHover: colorPalette.gray600,
  buttonNeutralBorder: colorPalette.gray300,
  buttonDisabledText: colorPalette.gray500,
  buttonDisabledBackground: colorPalette.gray800,
  buttonDisabledBorder: colorPalette.gray500,
  buttonShadow: colorPalette.gray700,
  noticeBackground: colorPalette.green800,
  noticeText: colorPalette.green300,
  noticeAccent: colorPalette.green500,
  warningBackground: colorPalette.orange800,
  warningText: colorPalette.orange200,
  warningAccent: colorPalette.orange500,
  errorBackground: colorPalette.red800,
  errorText: colorPalette.red200,
  errorAccent: colorPalette.red500,
  formLabelText: colorPalette.purple150,
  formInputBackground: colorPalette.gray800,
  formInputBackgroundSelected: colorPalette.purple400,
  formInputBackgroundSelection: colorPalette.purple400,
  formInputBorder: colorPalette.gray600,
  formInputTextReadOnlySelection: colorPalette.gray800,
  formInputBorderSelected: colorPalette.purple400,
  formInputText: colorPalette.gray150,
  formInputTextSelected: colorPalette.black,
  formInputTextPlaceholder: colorPalette.gray150,
  formInputTextSelection: colorPalette.gray800,
  formInputShadowSelected: colorPalette.purple400,
  formInputTextHighlight: colorPalette.purple400,
  pillBackground: colorPalette.gray600,
  pillText: colorPalette.gray200,
  pillBorder: colorPalette.gray700,
  pillBackgroundSelected: colorPalette.purple600,
  pillTextSelected: colorPalette.gray150,
  pillBorderSelected: colorPalette.purple400,
} as const;

const colorsLight = {
  pageBackground: colorPalette.gray100,
  pageBackgroundModalActive: colorPalette.gray200,
  pageBackgroundTopLeft: colorPalette.gray100,
  pageBackgroundBottomRight: colorPalette.navy100,
  pageBackgroundLineTop: colorPalette.white,
  pageBackgroundLineMid: colorPalette.gray100,
  pageBackgroundLineBottom: colorPalette.navy150,
  pageText: colorPalette.gray700,
  pageTextSubdued: colorPalette.gray300,
  pageTextPositive: colorPalette.purple500,
  pageTextLink: colorPalette.navy600,
  modalBackground: colorPalette.white,
  modalBorder: colorPalette.white,
  cardBackground: colorPalette.white,
  cardBorder: colorPalette.purple500,
  cardShadow: colorPalette.gray700,
  tableBackground: colorPalette.white,
  tableRowBackgroundHover: colorPalette.navy100,
  tableText: colorPalette.gray700,
  tableTextSelected: colorPalette.gray700,
  tableTextHover: colorPalette.gray900,
  tableTextEditing: colorPalette.gray50,
  tableTextEditingBackground: colorPalette.purple500,
  tableTextInactive: colorPalette.gray300,
  tableHeaderText: colorPalette.gray500,
  tableHeaderBackground: colorPalette.gray50,
  tableBorder: colorPalette.gray150,
  tableBorderSelected: colorPalette.purple500,
  tableBorderHover: colorPalette.purple400,
  tableBorderSeparator: colorPalette.gray400,
  tableRowBackgroundHighlight: colorPalette.purple100,
  tableRowBackgroundHighlightText: colorPalette.gray700,
  tableRowHeaderBackground: colorPalette.gray50,
  tableRowHeaderText: colorPalette.gray800,
  sidebarBackground: colorPalette.navy800,
  sidebarItemBackground: colorPalette.navy800,
  sidebarItemBackgroundSelected: colorPalette.navy800,
  sidebarItemBackgroundHover: colorPalette.navy700,
  sidebarItemAccent: colorPalette.navy800,
  sidebarItemAccentSelected: colorPalette.purple300,
  sidebarItemAccentHover: colorPalette.navy700,
  sidebarItemText: colorPalette.gray100,
  sidebarItemTextSelected: colorPalette.purple300,
  sidebarItemTextHover: colorPalette.gray50,
  tooltipBackground: colorPalette.gray50,
  tooltipBorder: colorPalette.gray50,
  menuBackground: colorPalette.gray50,
  menuItemBackground: colorPalette.gray50,
  menuItemBackgroundHover: colorPalette.gray150,
  menuItemText: colorPalette.gray800,
  menuItemTextHover: colorPalette.gray800,
  menuItemTextSelected: colorPalette.gray800,
  menuItemTextHeader: colorPalette.purple600,
  menuBorder: colorPalette.gray100,
  menuBorderHover: colorPalette.purple100,
  altMenuBackground: colorPalette.navy800,
  altMenuItemBackground: colorPalette.navy800,
  altMenuItemBackgroundHover: colorPalette.navy700,
  altMenuItemText: colorPalette.gray100,
  altMenuItemTextHover: colorPalette.gray50,
  altMenuItemTextSelected: colorPalette.purple300,
  altMenuItemTextHeader: colorPalette.purple300,
  altMenuBorder: colorPalette.navy700,
  altMenuBorderHover: colorPalette.purple300,
  buttonAltMenuText: colorPalette.gray100,
  buttonAltMenuTextHover: colorPalette.gray50,
  buttonAltMenuTextSelected: colorPalette.gray50,
  buttonAltMenuBackground: colorPalette.navy800,
  buttonAltMenuBackgroundHover: colorPalette.navy700,
  buttonAltMenuBorder: colorPalette.gray200,
  buttonPositiveText: colorPalette.gray50,
  buttonPositiveTextHover: colorPalette.purple600,
  buttonPositiveTextSelected: colorPalette.gray50,
  buttonPositiveBackground: colorPalette.purple600,
  buttonPositiveBackgroundHover: colorPalette.gray50,
  buttonPositiveBorder: colorPalette.purple600,
  buttonNeutralText: colorPalette.gray700,
  buttonNeutralTextHover: colorPalette.gray800,
  buttonNeutralBackground: colorPalette.gray50,
  buttonNeutralBackgroundHover: colorPalette.gray100,
  buttonNeutralBorder: colorPalette.gray200,
  buttonDisabledText: colorPalette.gray300,
  buttonDisabledBackground: colorPalette.gray50,
  buttonDisabledBorder: colorPalette.gray300,
  buttonShadow: colorPalette.purple500,
  noticeBackground: colorPalette.green50,
  noticeText: colorPalette.green500,
  noticeAccent: colorPalette.green200,
  warningBackground: colorPalette.orange50,
  warningText: colorPalette.orange500,
  warningAccent: colorPalette.orange200,
  errorBackground: colorPalette.red50,
  errorText: colorPalette.red500,
  errorAccent: colorPalette.red200,
  formLabelText: colorPalette.navy500,
  formInputBackground: colorPalette.gray50,
  formInputBackgroundSelected: colorPalette.purple500,
  formInputBackgroundSelection: colorPalette.purple500,
  formInputBorder: colorPalette.gray300,
  formInputTextReadOnlySelection: colorPalette.gray50,
  formInputBorderSelected: colorPalette.purple500,
  formInputText: colorPalette.gray700,
  formInputTextSelected: colorPalette.gray50,
  formInputTextPlaceholder: colorPalette.gray300,
  formInputTextSelection: colorPalette.gray100,
  formInputShadowSelected: colorPalette.purple500,
  formInputTextHighlight: colorPalette.purple500,
  pillBackground: colorPalette.gray150,
  pillText: colorPalette.gray800,
  pillBorder: colorPalette.gray150,
  pillBackgroundSelected: colorPalette.purple150,
  pillTextSelected: colorPalette.gray700,
  pillBorderSelected: colorPalette.purple500,
} as const;

const colorsDevelopment = {
  pageBackground: colorPalette.navy600,
  pageBackgroundModalActive: colorPalette.navy700,
  pageBackgroundTopLeft: colorPalette.green300,
  pageBackgroundBottomRight: colorPalette.red600,
  pageBackgroundLineTop: colorPalette.gray50,
  pageBackgroundLineMid: colorPalette.green500,
  pageBackgroundLineBottom: colorPalette.orange200,
  pageText: colorPalette.navy300,
  pageTextSubdued: colorPalette.navy500,
  pageTextPositive: colorPalette.navy50,
  pageTextLink: colorPalette.navy400,
  modalBackground: colorPalette.gray900,
  modalBorder: colorPalette.gray200,
  cardBackground: colorPalette.purple700,
  cardBorder: colorPalette.purple400,
  cardShadow: colorPalette.purple100,
  tableBackground: colorPalette.red900,
  tableRowBackgroundHover: colorPalette.red800,
  tableText: colorPalette.red200,
  tableTextSelected: colorPalette.red150,
  tableTextHover: colorPalette.red400,
  tableTextEditing: colorPalette.black,
  tableTextEditingBackground: colorPalette.red200,
  tableTextInactive: colorPalette.red500,
  tableHeaderText: colorPalette.red700,
  tableHeaderBackground: colorPalette.red300,
  tableBorder: colorPalette.red200,
  tableBorderSelected: colorPalette.purple400,
  tableBorderHover: colorPalette.purple300,
  tableBorderSeparator: colorPalette.gray400,
  tableRowBackgroundHighlight: colorPalette.red700,
  tableRowBackgroundHighlightText: colorPalette.red200,
  tableRowHeaderBackground: colorPalette.red100,
  tableRowHeaderText: colorPalette.red700,
  sidebarBackground: colorPalette.orange800,
  sidebarItemBackground: colorPalette.orange700,
  sidebarItemBackgroundSelected: colorPalette.orange900,
  sidebarItemBackgroundHover: colorPalette.orange500,
  sidebarItemAccent: colorPalette.orange200,
  sidebarItemAccentSelected: colorPalette.orange400,
  sidebarItemAccentHover: colorPalette.orange200,
  sidebarItemText: colorPalette.orange200,
  sidebarItemTextSelected: colorPalette.orange400,
  sidebarItemTextHover: colorPalette.orange150,
  tooltipBackground: colorPalette.white,
  tooltipBorder: colorPalette.black,
  menuBackground: colorPalette.green800,
  menuItemBackground: colorPalette.green700,
  menuItemBackgroundHover: colorPalette.green500,
  menuItemText: colorPalette.green200,
  menuItemTextHover: colorPalette.green50,
  menuItemTextSelected: colorPalette.green500,
  menuItemTextHeader: colorPalette.green300,
  menuBorder: colorPalette.green500,
  menuBorderHover: colorPalette.green900,
  altMenuBackground: colorPalette.gray700,
  altMenuItemBackground: colorPalette.gray700,
  altMenuItemBackgroundHover: colorPalette.gray600,
  altMenuItemText: colorPalette.gray150,
  altMenuItemTextHover: colorPalette.gray150,
  altMenuItemTextSelected: colorPalette.gray150,
  altMenuItemTextHeader: colorPalette.purple500,
  altMenuBorder: colorPalette.gray200,
  altMenuBorderHover: colorPalette.purple400,
  buttonAltMenuText: colorPalette.gray150,
  buttonAltMenuTextHover: colorPalette.gray100,
  buttonAltMenuTextSelected: colorPalette.gray100,
  buttonAltMenuBackground: colorPalette.gray800,
  buttonAltMenuBackgroundHover: colorPalette.gray600,
  buttonAltMenuBorder: colorPalette.gray600,
  buttonPositiveText: colorPalette.purple200,
  buttonPositiveTextHover: colorPalette.purple50,
  buttonPositiveTextSelected: colorPalette.purple600,
  buttonPositiveBackground: colorPalette.purple400,
  buttonPositiveBackgroundHover: colorPalette.purple800,
  buttonPositiveBorder: colorPalette.purple700,
  buttonNeutralText: colorPalette.gray50,
  buttonNeutralTextHover: colorPalette.gray200,
  buttonNeutralBackground: colorPalette.gray400,
  buttonNeutralBackgroundHover: colorPalette.gray500,
  buttonNeutralBorder: colorPalette.gray800,
  buttonDisabledText: colorPalette.gray500,
  buttonDisabledBackground: colorPalette.gray800,
  buttonDisabledBorder: colorPalette.gray500,
  buttonShadow: colorPalette.gray700,
  noticeBackground: colorPalette.green800,
  noticeText: colorPalette.green300,
  noticeAccent: colorPalette.green500,
  warningBackground: colorPalette.orange800,
  warningText: colorPalette.orange200,
  warningAccent: colorPalette.orange500,
  errorBackground: colorPalette.red800,
  errorText: colorPalette.red200,
  errorAccent: colorPalette.red500,
  formLabelText: colorPalette.purple200,
  formInputBackground: colorPalette.purple700,
  formInputBackgroundSelected: colorPalette.purple400,
  formInputBackgroundSelection: colorPalette.purple400,
  formInputBorder: colorPalette.purple600,
  formInputTextReadOnlySelection: colorPalette.purple800,
  formInputBorderSelected: colorPalette.purple100,
  formInputText: colorPalette.purple150,
  formInputTextSelected: colorPalette.purple800,
  formInputTextPlaceholder: colorPalette.gray150,
  formInputTextSelection: colorPalette.gray800,
  formInputShadowSelected: colorPalette.purple400,
  formInputTextHighlight: colorPalette.purple400,
  pillBackground: colorPalette.green800,
  pillText: colorPalette.green600,
  pillBorder: colorPalette.green200,
  pillBackgroundSelected: colorPalette.green100,
  pillTextSelected: colorPalette.green700,
  pillBorderSelected: colorPalette.green900,
} as const;

const colorThemes = {
  light: colorsLight,
  dark: colorsDark,
  ...(isNonProductionEnvironment() && { development: colorsDevelopment }),
};

export function GetColorThemes() {
  return Object.keys(colorThemes);
}

export function ThemeStyle({ theme }: { theme: keyof typeof colorThemes }) {
  let themeColors = colorThemes[theme];
  let css = Object.keys(themeColors)
    .map(key => {
      return `--${key}: ${themeColors[key]};`;
    })
    .join('\n');
  return <style>{`:root { ${css} }`}</style>;
}

export const colors = Object.fromEntries(
  Object.keys(colorsDark).map(key => [key, `var(--${key})`]),
) as Record<keyof typeof colorsDark, string>;

export const styles = {
  incomeHeaderHeight: 70,
  cardShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  monthRightPadding: 5,
  menuBorderRadius: 4,
  altMenuMaxHeight: 250,
  altMenuText: {
    fontSize: 13,
  },
  altMenuHeaderText: {
    fontSize: 13,
    fontWeight: 700,
  },
  veryLargeText: {
    fontSize: 30,
    fontWeight: 600,
  },
  largeText: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  mediumText: {
    fontSize: 15,
    fontWeight: 500,
  },
  smallText: {
    fontSize: 13,
  },
  verySmallText: {
    fontSize: 13,
  },
  page: {
    flex: 1,
    minHeight: 700, // ensure we can scroll on small screens
    paddingTop: 8, // height of the titlebar
    [`@media (min-width: ${tokens.breakpoint_small})`]: {
      paddingTop: 36,
    },
  },
  pageContent: {
    paddingLeft: 2,
    paddingRight: 2,
    [`@media (min-width: ${tokens.breakpoint_small})`]: {
      paddingLeft: 20,
      paddingRight: 20,
    },
  },
  settingsPageContent: {
    padding: 20,
    [`@media (min-width: ${tokens.breakpoint_small})`]: {
      padding: 'inherit',
    },
  },
  staticText: {
    cursor: 'default',
    userSelect: 'none',
  },
  shadow: {
    boxShadow: '0 2px 4px 0 rgba(0,0,0,0.1)',
  },
  shadowLarge: {
    boxShadow: '0 15px 30px 0 rgba(0,0,0,0.11), 0 5px 15px 0 rgba(0,0,0,0.08)',
  },
  tnum: {
    // eslint-disable-next-line rulesdir/typography
    fontFeatureSettings: '"tnum"',
  },
  notFixed: { fontFeatureSettings: '' },
  text: {
    fontSize: 16,
    // lineHeight: 22.4 // TODO: This seems like trouble, but what's the right value?
  },

  delayedFadeIn: {
    animationName: keyframes({
      '0%': { opacity: 0 },
      '100%': { opacity: 1 },
    }),
    animationDuration: '0.2s',
    animationFillMode: 'both',
    animationDelay: '0.5s',
  },
  // Dynamically set
  lightScrollbar: null as CSSProperties | null,
  darkScrollbar: null as CSSProperties | null,
  scrollbarWidth: null as number | null,
};

let hiddenScrollbars = false;

// need both styles defined for primary and secondary colors
// e.g. transaction table and sidebar
// lightScrollbar => primary
// darkScrollbar => secondary
function onScrollbarChange() {
  styles.lightScrollbar = hiddenScrollbars
    ? null
    : {
        // webkit
        '& ::-webkit-scrollbar': {
          width: 9,
        },
        '& ::-webkit-scrollbar-thumb': {
          borderRadius: 30,
          backgroundClip: 'padding-box',
          background: colors.menuItemBackgroundHover,
        },
      };

  styles.darkScrollbar = hiddenScrollbars
    ? null
    : {
        // webkit
        '& ::-webkit-scrollbar': {
          width: 9,
        },
        '& ::-webkit-scrollbar-thumb': {
          borderRadius: 30,
          backgroundClip: 'padding-box',
          background: colors.sidebarItemBackgroundHover,
        },
      };

  styles.scrollbarWidth = hiddenScrollbars ? 0 : 11;
}

if (Platform.env === 'web') {
  function testScrollbars() {
    let el = document.createElement('div');
    el.innerHTML =
      '<div style="width:100px;height:100px;overflow:scroll;position:absolute;top:-9999px;"/>';
    document.body.appendChild(el);
    let testNode = el.childNodes[0] as HTMLDivElement;
    if (testNode.offsetWidth === testNode.clientWidth) {
      return true;
    }
    return false;
  }

  hiddenScrollbars = testScrollbars();
  onScrollbarChange();

  window.addEventListener('focus', () => {
    hiddenScrollbars = testScrollbars();
    onScrollbarChange();
  });
}

export const hasHiddenScrollbars = () => hiddenScrollbars;
