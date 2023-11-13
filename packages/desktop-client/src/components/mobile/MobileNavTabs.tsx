import React, { type ComponentType, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useSpring, animated, config } from 'react-spring';

import { useDrag } from '@use-gesture/react';

import usePrevious from '../../hooks/usePrevious';
import Add from '../../icons/v1/Add';
import Cog from '../../icons/v1/Cog';
import PiggyBank from '../../icons/v1/PiggyBank';
import StoreFront from '../../icons/v1/StoreFront';
import Tuning from '../../icons/v1/Tuning';
import Wallet from '../../icons/v1/Wallet';
import Calendar from '../../icons/v2/Calendar';
import { useResponsive } from '../../ResponsiveProvider';
import { theme, styles, type CSSProperties } from '../../style';
import View from '../common/View';
import { useScroll } from '../ScrollProvider';

export default function MobileNavTabs() {
  const { isNarrowWidth } = useResponsive();
  const { scrollY } = useScroll();

  const columnCount = 3;
  const totalRowCount = 3;
  const rowHeight = 70;

  const navTabStyle = {
    flex: `1 1 ${100 / columnCount}%`,
    height: rowHeight,
    padding: 10,
  };

  const navTabs = [
    {
      name: 'Budget',
      path: '/budget',
      style: navTabStyle,
      icon: Wallet,
    },
    {
      name: 'Accounts',
      path: '/accounts',
      style: navTabStyle,
      icon: PiggyBank,
    },
    {
      name: 'Transaction',
      path: '/transactions/new',
      style: navTabStyle,
      icon: Add,
    },
    {
      name: 'Schedules (Soon)',
      path: '/schedules/soon',
      style: navTabStyle,
      icon: Calendar,
    },
    {
      name: 'Payees (Soon)',
      path: '/payees/soon',
      style: navTabStyle,
      icon: StoreFront,
    },
    {
      name: 'Rules (Soon)',
      path: '/rules/soon',
      style: navTabStyle,
      icon: Tuning,
    },
    {
      name: 'Settings',
      path: '/settings',
      style: navTabStyle,
      icon: Cog,
    },
  ].map(tab => <NavTab key={tab.path} {...tab} />);

  const bufferTabsCount = columnCount - (navTabs.length % columnCount);
  const bufferTabs = Array.from({ length: bufferTabsCount }).map((_, idx) => (
    <div key={idx} style={navTabStyle} />
  ));

  const totalHeight = rowHeight * totalRowCount;
  const openY = 0;
  const closeY = totalHeight - rowHeight;
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
    if (scrollY > previousScrollY && previousScrollY !== 0) {
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
      if (oy < -rowHeight) {
        cancel();
      }

      // when the user releases the sheet, we check whether it passed
      // the threshold for it to close, or if we reset it to its open position
      if (last) {
        if (oy > rowHeight * 0.5 || (vy > 0.5 && dy > 0)) {
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
      bounds: { top: rowHeight * 0.5, bottom: totalHeight * 0.5 },
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
        height: totalHeight,
        width: '100%',
        position: 'fixed',
        zIndex: 100,
        bottom: 0,
        display: isNarrowWidth ? 'flex' : 'none',
      }}
    >
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
  icon: ComponentType<NavTabIconProps>;
  style?: CSSProperties;
};

function NavTab({ icon: TabIcon, name, path, style }: NavTabProps) {
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
