import React, { type ComponentType, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useSpring, animated, config } from 'react-spring';

import { useDrag } from '@use-gesture/react';

import usePrevious from '../../hooks/usePrevious';
import Add from '../../icons/v1/Add';
import Cog from '../../icons/v1/Cog';
import PiggyBank from '../../icons/v1/PiggyBank';
import Wallet from '../../icons/v1/Wallet';
import { useResponsive } from '../../ResponsiveProvider';
import { theme, styles, type CSSProperties } from '../../style';
import View from '../common/View';
import { useScroll } from '../ScrollProvider';

export default function MobileNavTabs() {
  const { isNarrowWidth } = useResponsive();
  const { scrollY } = useScroll();

  const totalRowCount = 2;
  const rowHeight = 70;
  const totalHeight = rowHeight * totalRowCount;
  const openY = 0;
  const closeY = rowHeight;
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

  const navTabStyle = {
    flex: '1 1 33%',
    height: rowHeight,
    padding: 10,
  };

  return (
    <animated.div
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
        <NavTab
          style={navTabStyle}
          name="Budget"
          path="/budget"
          icon={Wallet}
        />
        <NavTab
          style={navTabStyle}
          name="Accounts"
          path="/accounts"
          icon={PiggyBank}
        />
        <NavTab
          style={navTabStyle}
          name="Transaction"
          path="/transactions/new"
          icon={Add}
        />
        <NavTab
          style={navTabStyle}
          name="Settings"
          path="/settings"
          icon={Cog}
        />
        <div style={navTabStyle} />
        <div style={navTabStyle} />
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
        ...style,
      })}
    >
      <TabIcon width={22} height={22} />
      {name}
    </NavLink>
  );
}
