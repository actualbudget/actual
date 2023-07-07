import type { CSSProperties } from 'glamor';
import { keyframes } from 'glamor';

import * as Platform from 'loot-core/src/client/platform';

import tokens from './tokens';

// Only for use in contextual color definitions
const colorPallet = {
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
  pageBackground: colorPallet.gray900,
  pageBackgroundModalActive: colorPallet.gray800,
  pageBackgroundTopLeft: colorPallet.gray900,
  pageBackgroundBottomRight: colorPallet.gray700,
  pageBackgroundLineTop: colorPallet.purple400,
  pageBackgroundLineMid: colorPallet.gray900,
  pageBackgroundLineBottom: colorPallet.gray100,
  pageText: colorPallet.gray100,
  pageTextSubdued: colorPallet.gray400,
  pageTextPositive: colorPallet.purple400,
  pageTextLink: colorPallet.purple400,
  modalBackground: colorPallet.gray700,
  modalBorder: colorPallet.gray600,
  cardBackground: colorPallet.gray800,
  cardBorder: colorPallet.purple400,
  cardShadow: colorPallet.gray700,
  tableBackground: colorPallet.gray800,
  tableRowBackgroundHover: colorPallet.gray700,
  tableText: colorPallet.gray100,
  tableTextSelected: colorPallet.gray100,
  tableTextHover: colorPallet.gray300,
  tableTextEditing: colorPallet.black,
  tableTextEditingBackground: colorPallet.purple400,
  tableTextInactive: colorPallet.gray400,
  tableHeaderText: colorPallet.gray200,
  tableHeaderBackground: colorPallet.gray700,
  tableBorder: colorPallet.gray600,
  tableBorderSelected: colorPallet.purple400,
  tableBorderHover: colorPallet.purple300,
  tableBorderSeparator: colorPallet.gray400,
  tableRowBackgroundHighlight: colorPallet.purple300,
  tableRowBackgroundHighlightText: colorPallet.gray800,
  tableRowHeaderBackground: colorPallet.gray700,
  tableRowHeaderBackgroundText: colorPallet.gray100,
  sidebarBackground: colorPallet.gray800,
  sidebarItemBackground: colorPallet.gray800,
  sidebarItemBackgroundSelected: colorPallet.gray800,
  sidebarItemBackgroundHover: colorPallet.gray700,
  sidebarItemAccent: colorPallet.gray800,
  sidebarItemAccentSelected: colorPallet.purple400,
  sidebarItemAccentHover: colorPallet.gray700,
  sidebarItemText: colorPallet.gray50,
  sidebarItemTextSelected: colorPallet.purple400,
  sidebarItemTextHover: colorPallet.gray50,
  tooltipBackground: colorPallet.gray600,
  tooltipBorder: colorPallet.gray500,
  menuBackground: colorPallet.gray600,
  menuItemBackground: colorPallet.gray600,
  menuItemBackgroundHover: colorPallet.gray500,
  menuItemText: colorPallet.gray100,
  menuItemTextHover: colorPallet.gray200,
  menuItemTextSelected: colorPallet.gray200,
  menuItemTextHeader: colorPallet.purple400,
  menuBorder: colorPallet.gray800,
  menuBorderHover: colorPallet.purple400,
  buttonPositiveText: colorPallet.black,
  buttonPositiveTextHover: colorPallet.gray100,
  buttonPositiveTextSelected: colorPallet.black,
  buttonPositiveBackground: colorPallet.purple400,
  buttonPositiveBackgroundHover: colorPallet.gray800,
  buttonPositiveBorder: colorPallet.purple400,
  buttonNeutralText: colorPallet.gray100,
  buttonNeutralTextHover: colorPallet.gray100,
  buttonNeutralBackground: colorPallet.gray800,
  buttonNeutralBackgroundHover: colorPallet.gray600,
  buttonNeutralBorder: colorPallet.gray300,
  buttonDisabledText: colorPallet.gray400,
  buttonDisabledBackground: colorPallet.gray800,
  buttonDisabledBorder: colorPallet.gray500,
  buttonShadow: colorPallet.gray700,
  noticeBackground: colorPallet.green800,
  noticeText: colorPallet.green200,
  noticeAccent: colorPallet.green500,
  warningBackground: colorPallet.orange800,
  warningText: colorPallet.orange200,
  warningAccent: colorPallet.orange500,
  errorBackground: colorPallet.red800,
  errorText: colorPallet.red200,
  errorAccent: colorPallet.red500,
  formLabelText: colorPallet.gray100,
  formInputBackground: colorPallet.gray800,
  formInputBackgroundSelected: colorPallet.purple400,
  formInputBackgroundSelection: colorPallet.purple400,
  formInputBorder: colorPallet.gray600,
  formInputTextReadOnlySelection: colorPallet.gray800,
  formInputBorderSelected: colorPallet.purple400,
  formInputText: colorPallet.gray100,
  formInputTextSelected: colorPallet.black,
  formInputTextPlaceholder: colorPallet.gray100,
  formInputTextSelection: colorPallet.gray800,
  formInputShadowSelected: colorPallet.purple400,
  formInputTextHighlight: colorPallet.purple400,
  editorBackground: colorPallet.gray900,
} as const;

const colorsLight = {
  pageBackground: colorPallet.gray100,
  pageBackgroundModalActive: colorPallet.gray200,
  pageBackgroundTopLeft: colorPallet.navy100,
  pageBackgroundBottomRight: colorPallet.navy150,
  pageBackgroundLineTop: colorPallet.navy50,
  pageBackgroundLineMid: colorPallet.gray150,
  pageBackgroundLineBottom: colorPallet.gray200,
  pageText: colorPallet.gray700,
  pageTextSubdued: colorPallet.gray300,
  pageTextPositive: colorPallet.purple500,
  pageTextLink: colorPallet.navy600,
  modalBackground: colorPallet.white,
  modalBorder: colorPallet.white,
  cardBackground: colorPallet.gray50,
  cardBorder: colorPallet.purple500,
  cardShadow: colorPallet.gray700,
  tableBackground: colorPallet.white,
  tableRowBackgroundHover: colorPallet.gray100,
  tableText: colorPallet.gray700,
  tableTextSelected: colorPallet.gray700,
  tableTextHover: colorPallet.gray900,
  tableTextEditing: colorPallet.gray50,
  tableTextEditingBackground: colorPallet.purple500,
  tableTextInactive: colorPallet.gray500,
  tableHeaderText: colorPallet.gray500,
  tableHeaderBackground: colorPallet.gray50,
  tableBorder: colorPallet.gray150,
  tableBorderSelected: colorPallet.purple500,
  tableBorderHover: colorPallet.purple400,
  tableBorderSeparator: colorPallet.gray400,
  tableRowBackgroundHighlight: colorPallet.purple100,
  tableRowBackgroundHighlightText: colorPallet.gray700,
  tableRowHeaderBackground: colorPallet.gray50,
  tableRowHeaderBackgroundText: colorPallet.gray800,
  sidebarBackground: colorPallet.navy800,
  sidebarItemBackground: colorPallet.navy800,
  sidebarItemBackgroundSelected: colorPallet.navy800,
  sidebarItemBackgroundHover: colorPallet.navy700,
  sidebarItemAccent: colorPallet.navy800,
  sidebarItemAccentSelected: colorPallet.purple300,
  sidebarItemAccentHover: colorPallet.navy700,
  sidebarItemText: colorPallet.gray100,
  sidebarItemTextSelected: colorPallet.purple300,
  sidebarItemTextHover: colorPallet.gray50,
  tooltipBackground: colorPallet.gray50,
  tooltipBorder: colorPallet.gray50,
  menuBackground: colorPallet.gray50,
  menuItemBackground: colorPallet.gray50,
  menuItemBackgroundHover: colorPallet.gray150,
  menuItemText: colorPallet.gray800,
  menuItemTextHover: colorPallet.gray800,
  menuItemTextSelected: colorPallet.gray800,
  menuItemTextHeader: colorPallet.purple600,
  menuBorder: colorPallet.gray100,
  menuBorderHover: colorPallet.purple100,
  buttonPositiveText: colorPallet.gray50,
  buttonPositiveTextHover: colorPallet.purple500,
  buttonPositiveTextSelected: colorPallet.gray50,
  buttonPositiveBackground: colorPallet.purple500,
  buttonPositiveBackgroundHover: colorPallet.gray50,
  buttonPositiveBorder: colorPallet.purple500,
  buttonNeutralText: colorPallet.gray700,
  buttonNeutralTextHover: colorPallet.gray800,
  buttonNeutralBackground: colorPallet.gray50,
  buttonNeutralBackgroundHover: colorPallet.gray100,
  buttonNeutralBorder: colorPallet.gray200,
  buttonDisabledText: colorPallet.gray300,
  buttonDisabledBackground: colorPallet.gray50,
  buttonDisabledBorder: colorPallet.gray300,
  buttonShadow: colorPallet.purple500,
  noticeBackground: colorPallet.green50,
  noticeText: colorPallet.green400,
  noticeAccent: colorPallet.green200,
  warningBackground: colorPallet.orange50,
  warningText: colorPallet.orange400,
  warningAccent: colorPallet.orange200,
  errorBackground: colorPallet.red50,
  errorText: colorPallet.red400,
  errorAccent: colorPallet.red200,
  formLabelText: colorPallet.gray700,
  formInputBackground: colorPallet.gray50,
  formInputBackgroundSelected: colorPallet.purple500,
  formInputBackgroundSelection: colorPallet.purple500,
  formInputBorder: colorPallet.gray300,
  formInputTextReadOnlySelection: colorPallet.gray50,
  formInputBorderSelected: colorPallet.purple500,
  formInputText: colorPallet.gray700,
  formInputTextSelected: colorPallet.gray50,
  formInputTextPlaceholder: colorPallet.gray300,
  formInputTextSelection: colorPallet.gray100,
  formInputShadowSelected: colorPallet.purple500,
  formInputTextHighlight: colorPallet.purple500,
  editorBackground: colorPallet.gray150,
} as const;

const colorThemes = {
  light: colorsLight,
  dark: colorsDark,
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

export const colorsm = Object.fromEntries(
  Object.keys(colorsDark).map(key => [key, `var(--${key})`]),
) as Record<keyof typeof colorsDark, string>;

export const styles = {
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
  pageHeader: {
    fontSize: 25,
    borderBottomWidth: 5,
    borderColor: '#ed6704',
    borderStyle: 'solid',
    display: 'inline',
    flex: 0,
    color: '#ed6704',
    marginTop: 40,
    marginBottom: 20,
    paddingBottom: 5,
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
          border: '2px solid rgba(100,100,100,0.5)',
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
          border: '2px solid rgba(100,100,100,0.5)',
          backgroundColor: colorsm.sidebarItemBackgroundHover,
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
