// @ts-strict-ignore
import React, { type ComponentType, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useSpring, animated, config } from 'react-spring';

import { useDrag } from '@use-gesture/react';

import { usePrevious } from '../../hooks/usePrevious';
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
import { useResponsive } from '../../ResponsiveProvider';
import { theme, styles, type CSSProperties } from '../../style';
import { View } from '../common/View';
import { useScroll } from '../ScrollProvider';

const COLUMN_COUNT = 3;
const PILL_HEIGHT = 15;
const ROW_HEIGHT = 70;
export const MOBILE_NAV_HEIGHT = ROW_HEIGHT + PILL_HEIGHT;

export function MobileNavTabs() {
  const { isNarrowWidth } = useResponsive();
  const { scrollY } = useScroll();

  const navTabStyle = {
    flex: `1 1 ${100 / COLUMN_COUNT}%`,
    height: ROW_HEIGHT,
    padding: 10,
  };

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
  ].map(tab => <NavTab key={tab.path} {...tab} />);

  const bufferTabsCount = COLUMN_COUNT - (navTabs.length % COLUMN_COUNT);
  const bufferTabs = Array.from({ length: bufferTabsCount }).map((_, idx) => (
    <div key={idx} style={navTabStyle} />
  ));

  const totalHeight = ROW_HEIGHT * COLUMN_COUNT;
  const openY = 0;
  const closeY = totalHeight - ROW_HEIGHT;
  const hiddenY = totalHeight;

  const [{ y }, api] = useSpring(() => ({ y: totalHeight }));

  const open = ({ canceled }) => {
    // when cancel is true, it means that the user passed the upwards threshold
    // so we change the spring config to create a nice wobbly effect
    api.start({
      y: openY,
      immediate: false,
      config: canceled ? config.wobbly : config.stiff,
    });
  };

  const close = (velocity = 0) => {
    api.start({
      y: closeY,
      immediate: false,
      config: { ...config.stiff, velocity },
    });
  };

  const hide = (velocity = 0) => {
    api.start({
      y: hiddenY,
      immediate: false,
      config: { ...config.stiff, velocity },
    });
  };

  const previousScrollY = usePrevious(scrollY);

  useEffect(() => {
    if (
      scrollY &&
      previousScrollY &&
      scrollY > previousScrollY &&
      previousScrollY !== 0
    ) {
      hide();
    } else {
      close();
    }
  }, [scrollY]);

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
          close(vy);
        } else {
          open({ canceled });
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
      bounds: { top: -totalHeight, bottom: totalHeight - ROW_HEIGHT },
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
        height: totalHeight + PILL_HEIGHT,
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
            background: theme.pillBorder,
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
            height: totalHeight,
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
};

function NavTab({ Icon: TabIcon, name, path, style }: NavTabProps) {
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
    >
      <TabIcon width={22} height={22} />
      {name}
    </NavLink>
  );
}
