// @ts-strict-ignore
import { keyframes } from 'glamor';

import * as Platform from 'loot-core/src/client/platform';

import { tokens } from '../tokens';

import { theme } from './theme';
import { type CSSProperties } from './types';

const MOBILE_MIN_HEIGHT = 40;

export const styles = {
  incomeHeaderHeight: 70,
  cardShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  monthRightPadding: 5,
  menuBorderRadius: 4,
  mobileMinHeight: MOBILE_MIN_HEIGHT,
  mobileMenuItem: {
    fontSize: 17,
    fontWeight: 400,
    paddingTop: 8,
    paddingBottom: 8,
    height: MOBILE_MIN_HEIGHT,
  },
  mobileEditingPadding: 12,
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
  tinyText: {
    fontSize: 10,
  },
  page: {
    flex: 1,
    '@media (max-height: 550px)': {
      minHeight: 700, // ensure we can scroll on small screens
    },
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
    animationDuration: '1s',
    animationFillMode: 'both',
    animationDelay: '0.5s',
  },
  underlinedText: {
    textDecoration: 'underline',
    textDecorationThickness: 2,
    textDecorationColor: theme.pillBorder,
  },
  noTapHighlight: {
    WebkitTapHighlightColor: 'transparent',
    ':focus': {
      outline: 'none',
    },
  },
  lineClamp: (lines: number) => {
    return {
      display: '-webkit-box',
      WebkitLineClamp: lines,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      wordBreak: 'break-word',
    };
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
  styles.lightScrollbar = !hiddenScrollbars && {
    '& ::-webkit-scrollbar': {
      width: 11,
      backgroundColor: 'rgba(200, 200, 200, .2)',
    },
    '& ::-webkit-scrollbar-thumb': {
      width: 7,
      borderRadius: 30,
      backgroundClip: 'padding-box',
      border: '2px solid rgba(0, 0, 0, 0)',
    },
    '& ::-webkit-scrollbar-thumb:vertical': {
      backgroundColor: '#d0d0d0',
    },
  };

  styles.darkScrollbar = !hiddenScrollbars && {
    '& ::-webkit-scrollbar': {
      width: 7,
      backgroundColor: 'rgba(0, 0, 0, 0)',
    },
    '& ::-webkit-scrollbar-thumb:vertical': {
      backgroundColor: 'rgba(200, 200, 200, .5)',
    },
  };

  styles.scrollbarWidth = hiddenScrollbars ? 0 : 13;
}

if (Platform.env === 'web') {
  function testScrollbars() {
    const el = document.createElement('div');
    el.innerHTML =
      '<div style="width:100px;height:100px;overflow:scroll;position:absolute;top:-9999px;"/>';
    document.body.appendChild(el);
    const testNode = el.childNodes[0] as HTMLDivElement;
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
