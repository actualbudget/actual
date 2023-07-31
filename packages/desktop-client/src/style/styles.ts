import { keyframes } from 'glamor';

import * as Platform from 'loot-core/src/client/platform';

import tokens from '../tokens';

import * as colors from './colors';

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
    [`@media (min-width: ${tokens.breakpoint_small})`]: {
      // lineHeight: 21 // TODO: This seems like trouble, but what's the right value?
    },
  },
  verySmallText: {
    fontSize: 13,
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
  pageHeader: {
    fontSize: 25,
    borderBottomWidth: 5,
    borderStyle: 'solid',
    display: 'inline',
    flex: 0,
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
  header: {
    headerStyle: {
      backgroundColor: 'white',
      borderBottomWidth: 1,
      borderBottomColor: colors.n9,
      elevation: 0,
    },
    headerTintColor: colors.n1,
    headerTitleStyle: {
      color: colors.n1,
      fontSize: 15,
      fontWeight: 600,
      userSelect: 'none',
    },
    headerBackTitle: null,
  },
  text: {
    fontSize: 16,
    // lineHeight: 22.4 // TODO: This seems like trouble, but what's the right value?
  },
  textColor: colors.n1,
  delayedFadeIn: {
    animationName: keyframes({
      '0%': { opacity: 0 },
      '100%': { opacity: 1 },
    }),
    animationDuration: '1s',
    animationFillMode: 'both',
    animationDelay: '0.5s',
  },
  // Dynamically set
  lightScrollbar: undefined,
  darkScrollbar: undefined,
  scrollbarWidth: undefined,
};

let hiddenScrollbars = false;

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
