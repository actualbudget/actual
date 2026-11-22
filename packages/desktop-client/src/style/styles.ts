import { fadeColor, styles } from '@actual-app/components/styles';
// @ts-strict-ignore
import { theme } from '@actual-app/components/theme';
import * as Platform from '@actual-app/core/shared/platform';

let hiddenScrollbars = false;

// need both styles defined for primary and secondary colors
// e.g. transaction table and sidebar
// lightScrollbar => primary
// darkScrollbar => secondary
function onScrollbarChange() {
  styles.horizontalScrollbar = !hiddenScrollbars && {
    '::-webkit-scrollbar': {
      backgroundColor: 'inherit',
      height: 12,
    },
    '::-webkit-scrollbar-thumb': {
      width: 7,
      borderRadius: 30,
      backgroundClip: 'padding-box',
      border: '2px solid transparent',
      backgroundColor: theme.scrollbarThumb,
    },
  };

  styles.lightScrollbar = !hiddenScrollbars && {
    '& ::-webkit-scrollbar': {
      width: 11,
      backgroundColor: fadeColor(theme.scrollbarThumb, 0.2),
    },
    '& ::-webkit-scrollbar-thumb': {
      width: 7,
      borderRadius: 30,
      backgroundClip: 'padding-box',
      border: '2px solid transparent',
    },
    '& ::-webkit-scrollbar-thumb:vertical': {
      backgroundColor: theme.scrollbarThumb,
    },
  };

  styles.darkScrollbar = !hiddenScrollbars && {
    '& ::-webkit-scrollbar': {
      width: 11,
      backgroundColor: 'transparent',
    },
    '& ::-webkit-scrollbar-thumb:vertical': {
      width: 7,
      borderRadius: 30,
      backgroundClip: 'padding-box',
      backgroundColor: fadeColor(theme.scrollbarThumb, 0.5),
      border: '2px solid transparent',
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
