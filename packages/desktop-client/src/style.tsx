import type { CSSProperties } from 'glamor';

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
  navy50: '#f5f7f9',
  navy100: '#e4effb',
  navy150: '#cddbf2',
  navy200: '#adc6e8',
  navy300: '#81aae3',
  navy400: '#4e84c5',
  navy500: '#3365a8',
  navy600: '#244c88',
  navy700: '#183765',
  navy800: '#0a2445',
  navy900: '#031225',
  green50: '#ecfed7',
  green100: '#d7f7c2',
  green150: '#a6eb84',
  green200: '#76df47',
  green300: '#48c404',
  green400: '#3fa40d',
  green500: '#228403',
  green600: '#006908',
  green700: '#0b5019',
  green800: '#043b15',
  green900: '#02220d',
  orange50: '#fef9da',
  orange100: '#fcedb9',
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
  red400: '#fc526a',
  red500: '#df1b41',
  red600: '#b3093c',
  red700: '#890d37',
  red800: '#68052b',
  red900: '#3e021a',
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
  pageTextSubdued: colorPallet.gray200,
  pageTextPositive: colorPallet.purple400,
  pageTextLink: colorPallet.purple400,
  modalBackground: colorPallet.gray800,
  cardBackground: colorPallet.gray800,
  cardBorder: colorPallet.purple400,
  cardShadow: colorPallet.gray700,
  tableBackground: colorPallet.gray800,
  tableBackgroundHover: colorPallet.gray700,
  tableText: colorPallet.gray100,
  tableTextSelected: colorPallet.gray100,
  tableTextHover: colorPallet.gray300,
  tableTextEditing: colorPallet.black,
  tableTextEditingBackground: colorPallet.purple400,
  tableTextInactive: colorPallet.gray400,
  tableHeaderText: colorPallet.gray100,
  tableHeaderBackground: colorPallet.gray700,
  tableBorder: colorPallet.gray700,
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
  tooltipBorder: colorPallet.purple400,
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
  noticeBackground: colorPallet.gray900,
  noticeText: colorPallet.green400,
  noticeAccent: colorPallet.gray700,
  warningBackground: colorPallet.orange400,
  warningText: colorPallet.gray900,
  warningAccent: colorPallet.orange100,
  errorBackground: colorPallet.gray800,
  errorText: colorPallet.red300,
  errorAccent: colorPallet.red400,
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
  pageTextSubdued: colorPallet.gray500,
  pageTextPositive: colorPallet.purple600,
  pageTextLink: colorPallet.navy600,
  modalBackground: colorPallet.white,
  cardBackground: colorPallet.gray50,
  cardBorder: colorPallet.purple600,
  cardShadow: colorPallet.gray700,
  tableBackground: colorPallet.white,
  tableBackgroundHover: colorPallet.gray150,
  tableText: colorPallet.gray700,
  tableTextSelected: colorPallet.gray700,
  tableTextHover: colorPallet.gray900,
  tableTextEditing: colorPallet.gray50,
  tableTextEditingBackground: colorPallet.purple600,
  tableTextInactive: colorPallet.gray500,
  tableHeaderText: colorPallet.gray600,
  tableHeaderBackground: colorPallet.gray150,
  tableBorder: colorPallet.gray150,
  tableBorderSelected: colorPallet.purple600,
  tableBorderHover: colorPallet.purple500,
  tableBorderSeparator: colorPallet.gray400,
  tableRowBackgroundHighlight: colorPallet.purple400,
  tableRowBackgroundHighlightText: colorPallet.gray700,
  tableRowHeaderBackground: colorPallet.gray100,
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
  tooltipBorder: colorPallet.gray300,
  menuBackground: colorPallet.gray50,
  menuItemBackground: colorPallet.gray50,
  menuItemBackgroundHover: colorPallet.gray150,
  menuItemText: colorPallet.gray800,
  menuItemTextHover: colorPallet.gray800,
  menuItemTextSelected: colorPallet.gray800,
  menuItemTextHeader: colorPallet.purple700,
  menuBorder: colorPallet.gray100,
  menuBorderHover: colorPallet.purple200,
  buttonPositiveText: colorPallet.gray50,
  buttonPositiveTextHover: colorPallet.purple600,
  buttonPositiveTextSelected: colorPallet.gray50,
  buttonPositiveBackground: colorPallet.purple600,
  buttonPositiveBackgroundHover: colorPallet.gray50,
  buttonPositiveBorder: colorPallet.purple600,
  buttonNeutralText: colorPallet.gray700,
  buttonNeutralTextHover: colorPallet.gray700,
  buttonNeutralBackground: colorPallet.gray50,
  buttonNeutralBackgroundHover: colorPallet.gray150,
  buttonNeutralBorder: colorPallet.gray300,
  buttonDisabledText: colorPallet.gray300,
  buttonDisabledBackground: colorPallet.gray50,
  buttonDisabledBorder: colorPallet.gray300,
  buttonShadow: colorPallet.purple600,
  noticeBackground: colorPallet.gray900,
  noticeText: colorPallet.green500,
  noticeAccent: colorPallet.gray700,
  warningBackground: colorPallet.orange300,
  warningText: colorPallet.gray900,
  warningAccent: colorPallet.orange100,
  errorBackground: colorPallet.gray50,
  errorText: colorPallet.red500,
  errorAccent: colorPallet.red500,
  formLabelText: colorPallet.gray700,
  formInputBackground: colorPallet.gray50,
  formInputBackgroundSelected: colorPallet.purple600,
  formInputBackgroundSelection: colorPallet.purple600,
  formInputBorder: colorPallet.gray300,
  formInputTextReadOnlySelection: colorPallet.gray50,
  formInputBorderSelected: colorPallet.purple600,
  formInputText: colorPallet.gray700,
  formInputTextSelected: colorPallet.gray50,
  formInputTextPlaceholder: colorPallet.gray300,
  formInputTextSelection: colorPallet.gray100,
  formInputShadowSelected: colorPallet.purple600,
  formInputTextHighlight: colorPallet.purple600,
} as const;

const colorThemes = {
  light: colorsLight,
  dark: colorsDark,
};

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

const _colors = {
  y1: '#733309',
  y2: '#87540d',
  y3: '#B88115',
  y4: '#D4A31C',
  y5: '#E6BB20',
  y6: '#F2D047',
  y7: '#F5E35D',
  y8: '#FCF088',
  y9: '#FFF7C4',
  y10: '#FFFBEA',
  y11: '#FFFEFA',
  r1: '#610316',
  r2: '#8A041A',
  r3: '#AB091E',
  r4: '#CF1124',
  r5: '#E12D39',
  r6: '#EF4E4E',
  r7: '#F86A6A',
  r8: '#FF9B9B',
  r9: '#FFBDBD',
  r10: '#FFE3E3',
  r11: '#FFF1F1',
  b1: '#034388',
  b2: '#0B5FA3',
  b3: '#1271BF',
  b4: '#1980D4',
  b5: '#2B8FED',
  b6: '#40A5F7',
  b7: '#66B5FA',
  b8: '#8BCAFD',
  b9: '#B3D9FF',
  b10: '#E3F0FF',
  b11: '#F5FCFF',
  n1: '#102A43',
  n2: '#243B53',
  n3: '#334E68',
  n4: '#486581',
  n5: '#627D98',
  n6: '#829AB1',
  n7: '#9FB3C8',
  n8: '#BCCCDC',
  n9: '#D9E2EC',
  n10: '#E8ECF0',
  n11: '#F7FAFC',
  g1: '#014D40',
  g2: '#0C6B58',
  g3: '#147D64',
  g4: '#199473',
  g5: '#27AB83',
  g6: '#3EBD93',
  g7: '#65D6AD',
  g8: '#8EEDC7',
  g9: '#C6F7E2',
  g10: '#EFFCF6',
  g11: '#FAFFFD',
  p1: '#44056E',
  p2: '#580A94',
  p3: '#690CB0',
  p4: '#7A0ECC',
  p5: '#8719E0',
  p6: '#9446ED',
  p7: '#A368FC',
  p8: '#B990FF',
  p9: '#DAC4FF',
  p10: '#F2EBFE',
  p11: '#F9F6FE',

  border: '#ed6704',
  hover: '#ed6704',
  selected: '#ed6704',
  bad: '#f00',
};

export const colors = {
  ..._colors,
  resolve(name, offset) {
    switch (name) {
      case 'border':
        return _colors['n' + (8 + offset)];
      default:
    }
    throw new Error('Unknown color name: ' + name);
  },
};

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
