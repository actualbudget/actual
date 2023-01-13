import Platform from 'loot-core/src/client/platform';

import tokens from './tokens';

export const debug = { borderWidth: 1, borderColor: 'red' };

export const colors = {
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
  p11: '#F9F6FE'
};

colors.border = colors.n10;
colors.hover = '#fafafa';
colors.selected = colors.b9;

colors.resolve = (name, offset) => {
  switch (name) {
    case 'border':
      return colors['n' + (8 + offset)];
    default:
  }
  throw new Error('Unknown color name: ' + name);
};

export const styles = {
  veryLargeText: {
    fontSize: 30,
    fontWeight: 600
  },
  largeText: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: 0.5
  },
  mediumText: {
    fontSize: 15,
    fontWeight: 500
  },
  smallText: {
    fontSize: 13,
    [`@media (min-width: ${tokens.breakpoint_medium})`]: {
      // lineHeight: 21 // TODO: This seems like trouble, but what's the right value?
    }
  },
  verySmallText: {
    fontSize: 13
  },
  page: {
    // This is the height of the titlebar
    paddingTop: 8,
    minWidth: 360,
    flex: 1,
    [`@media (min-width: ${tokens.breakpoint_medium})`]: {
      minWidth: 500,
      paddingTop: 36
    }
  },
  pageHeader: {
    fontSize: 25,
    borderBottomWidth: 5,
    borderColor: colors.purple2,
    borderStyle: 'solid',
    display: 'inline',
    flex: 0,
    color: colors.grey4,
    marginTop: 40,
    marginBottom: 20,
    paddingBottom: 5
  },
  pageContent: {
    paddingLeft: 2,
    paddingRight: 2,
    [`@media (min-width: ${tokens.breakpoint_medium})`]: {
      paddingLeft: 20,
      paddingRight: 20
    }
  },
  settingsPageContent: {
    padding: 20,
    [`@media (min-width: ${tokens.breakpoint_medium})`]: {
      padding: 'inherit'
    }
  },
  staticText: {
    cursor: 'default',
    userSelect: 'none'
  },
  shadow: {
    boxShadow: '0 2px 4px 0 rgba(0,0,0,0.1)'
  },
  shadowLarge: {
    boxShadow: '0 15px 30px 0 rgba(0,0,0,0.11), 0 5px 15px 0 rgba(0,0,0,0.08)'
  },
  tnum: {
    fontFeatureSettings: '"tnum"'
  },
  notFixed: { fontFeatureSettings: '' },
  header: {
    headerStyle: {
      backgroundColor: 'white',
      borderBottomWidth: 1,
      borderBottomColor: colors.n9,
      elevation: 0
    },
    headerTintColor: colors.n1,
    headerTitleStyle: {
      color: colors.n1,
      fontSize: 15,
      fontWeight: 600
    },
    headerBackTitle: null
  },
  text: {
    fontSize: 16
    // lineHeight: 22.4 // TODO: This seems like trouble, but what's the right value?
  },
  textColor: colors.n1
};

let hiddenScrollbars = false;

function onScrollbarChange() {
  styles.lightScrollbar = !hiddenScrollbars && {
    '& ::-webkit-scrollbar': {
      width: 11,
      backgroundColor: 'rgba(200, 200, 200, .2)'
    },
    '& ::-webkit-scrollbar-thumb': {
      width: 7,
      borderRadius: 30,
      backgroundClip: 'padding-box',
      border: '2px solid rgba(0, 0, 0, 0)'
    },
    '& ::-webkit-scrollbar-thumb:vertical': {
      backgroundColor: '#d0d0d0'
    }
  };

  styles.darkScrollbar = !hiddenScrollbars && {
    '& ::-webkit-scrollbar': {
      width: 7,
      backgroundColor: 'rgba(0, 0, 0, 0)'
    },
    '& ::-webkit-scrollbar-thumb:vertical': {
      backgroundColor: 'rgba(200, 200, 200, .5)'
    }
  };

  styles.scrollbarWidth = hiddenScrollbars ? 0 : 13;
}

if (Platform.env === 'web') {
  function testScrollbars() {
    let el = document.createElement('div');
    el.innerHTML =
      '<div style="width:100px;height:100px;overflow:scroll;position:absolute;top:-9999px;"/>';
    document.body.appendChild(el);
    let testNode = el.childNodes[0];
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

export function transform(spec) {
  // We've made React Native Web simulate a mobile environment so it
  // won't return "web" here. Explicit check for it so we can override
  // mobile behavior and return a value appropriate for the web.
  if (Platform.env !== 'web' && !Platform.isReactNativeWeb) {
    return spec;
  }

  let r = spec.reduce((str, prop) => {
    let name = Object.keys(prop)[0];
    let value = prop[name];
    if (typeof value === 'number') {
      value = value + 'px';
    }

    return `${name}(${value})`;
  }, spec);
  return r;
}
