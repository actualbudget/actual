import React, {
  useCallback,
  type ComponentProps,
  type ComponentType,
  type CSSProperties,
} from 'react';
import { NavLink } from 'react-router-dom';
import { useSpring, animated, config } from 'react-spring';

import { useDrag } from '@use-gesture/react';

import {
  SvgAdd,
  SvgCog,
  SvgPiggyBank,
  SvgStoreFront,
  SvgTuning,
  SvgWallet,
} from '../../icons/v1';
import { SvgReports } from '../../icons/v1/Reports';
import { SvgCalendar } from '../../icons/v2';
import { theme, styles } from '../../style';
import { View } from '../common/View';
import { useResponsive } from '../responsive/ResponsiveProvider';
import { useScrollListener } from '../ScrollProvider';

const COLUMN_COUNT = 3;
const PILL_HEIGHT = 15;
const ROW_HEIGHT = 70;
const TOTAL_HEIGHT = ROW_HEIGHT * COLUMN_COUNT;
const OPEN_FULL_Y = 1;
const OPEN_DEFAULT_Y = TOTAL_HEIGHT - ROW_HEIGHT;
const HIDDEN_Y = TOTAL_HEIGHT;

export const MOBILE_NAV_HEIGHT = ROW_HEIGHT + PILL_HEIGHT;

export function MobileNavTabs() {
  const { isNarrowWidth } = useResponsive();

  const navTabStyle = {
    flex: `1 1 ${100 / COLUMN_COUNT}%`,
    height: ROW_HEIGHT,
    padding: 10,
  };

  const [{ y }, api] = useSpring(() => ({ y: OPEN_DEFAULT_Y }));

  const openFull = useCallback(
    ({ canceled }: { canceled?: boolean }) => {
      // when cancel is true, it means that the user passed the upwards threshold
      // so we change the spring config to create a nice wobbly effect
      api.start({
        y: OPEN_FULL_Y,
        immediate: false,
        config: canceled ? config.wobbly : config.stiff,
      });
    },
    [api, OPEN_FULL_Y],
  );

  const openDefault = useCallback(
    (velocity = 0) => {
      api.start({
        y: OPEN_DEFAULT_Y,
        immediate: false,
        config: { ...config.stiff, velocity },
      });
    },
    [api, OPEN_DEFAULT_Y],
  );

  const hide = useCallback(
    (velocity = 0) => {
      api.start({
        y: HIDDEN_Y,
        immediate: false,
        config: { ...config.stiff, velocity },
      });
    },
    [api, HIDDEN_Y],
  );

  const navTabs = [
    {
      name: 'Budget',
      path: '/budget',
      style: navTabStyle,
      Icon: SvgWallet,
    },
    {
      name: 'Transaction',
      path: '/transactions/new',
      style: navTabStyle,
      Icon: SvgAdd,
    },
    {
      name: 'Accounts',
      path: '/accounts',
      style: navTabStyle,
      Icon: SvgPiggyBank,
    },
    {
      name: 'Reports',
      path: '/reports',
      style: navTabStyle,
      Icon: SvgReports,
    },
    {
      name: 'Schedules (Soon)',
      path: '/schedules/soon',
      style: navTabStyle,
      Icon: SvgCalendar,
    },
    {
      name: 'Payees (Soon)',
      path: '/payees/soon',
      style: navTabStyle,
      Icon: SvgStoreFront,
    },
    {
      name: 'Rules (Soon)',
      path: '/rules/soon',
      style: navTabStyle,
      Icon: SvgTuning,
    },
    {
      name: 'Settings',
      path: '/settings',
      style: navTabStyle,
      Icon: SvgCog,
    },
  ].map(tab => (
    <NavTab key={tab.path} onClick={() => openDefault()} {...tab} />
  ));

  const bufferTabsCount = COLUMN_COUNT - (navTabs.length % COLUMN_COUNT);
  const bufferTabs = Array.from({ length: bufferTabsCount }).map((_, idx) => (
    <div key={idx} style={navTabStyle} />
  ));

  useScrollListener(({ isScrolling, hasScrolledToEnd }) => {
    if (isScrolling('down') && !hasScrolledToEnd('up')) {
      hide();
    } else if (isScrolling('up') && !hasScrolledToEnd('down')) {
      openDefault();
    }
  });

  const bind = useDrag(
    ({
      last,
      velocity: [, vy],
      direction: [, dy],
      offset: [, oy],
      cancel,
      canceled,
    }) => {
      // if the user drags up passed a threshold, then we cancel
      // the drag so that the sheet resets to its open position
      if (oy < 0) {
        cancel();
      }

      // when the user releases the sheet, we check whether it passed
      // the threshold for it to close, or if we reset it to its open position
      if (last) {
        if (oy > ROW_HEIGHT * 0.5 || (vy > 0.5 && dy > 0)) {
          openDefault(vy);
        } else {
          openFull({ canceled });
        }
      } else {
        // when the user keeps dragging, we just move the sheet according to
        // the cursor position
        api.start({ y: oy, immediate: true });
      }
    },
    {
      from: () => [0, y.get()],
      filterTaps: true,
      bounds: { top: -TOTAL_HEIGHT, bottom: TOTAL_HEIGHT - ROW_HEIGHT },
      axis: 'y',
      rubberband: true,
    },
  );

  return (
    <animated.div
      role="navigation"
      {...bind()}
      style={{
        y,
        touchAction: 'pan-x',
        backgroundColor: theme.mobileNavBackground,
        borderTop: `1px solid ${theme.menuBorder}`,
        ...styles.shadow,
        height: TOTAL_HEIGHT + PILL_HEIGHT,
        width: '100%',
        position: 'fixed',
        zIndex: 100,
        bottom: 0,
        ...(!isNarrowWidth && { display: 'none' }),
      }}
    >
      <View>
        <div
          style={{
            backgroundColor: theme.pillBorder,
            borderRadius: 10,
            width: 30,
            marginTop: 5,
            marginBottom: 5,
            padding: 2,
            alignSelf: 'center',
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            height: TOTAL_HEIGHT,
            width: '100%',
          }}
        >
          {[navTabs, bufferTabs]}
        </View>
      </View>
    </animated.div>
  );
}

type NavTabIconProps = {
  width: number;
  height: number;
};

type NavTabProps = {
  name: string;
  path: string;
  Icon: ComponentType<NavTabIconProps>;
  style?: CSSProperties;
  onClick: ComponentProps<typeof NavLink>['onClick'];
};

function NavTab({ Icon: TabIcon, name, path, style, onClick }: NavTabProps) {
  return (
    <NavLink
      to={path}
      style={({ isActive }) => ({
        ...styles.noTapHighlight,
        alignItems: 'center',
        color: isActive ? theme.mobileNavItemSelected : theme.mobileNavItem,
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        textAlign: 'center',
        ...style,
      })}
      onClick={onClick}
    >
      <TabIcon width={22} height={22} />
      {name}
    </NavLink>
  );
}
