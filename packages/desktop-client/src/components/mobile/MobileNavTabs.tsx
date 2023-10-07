import React, { useRef, type ComponentType, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

import Add from '../../icons/v1/Add';
import Cog from '../../icons/v1/Cog';
import PiggyBank from '../../icons/v1/PiggyBank';
import Wallet from '../../icons/v1/Wallet';
import { useResponsive } from '../../ResponsiveProvider';
import { theme, styles } from '../../style';
import { useScroll } from '../ScrollProvider';

export default function MobileNavTabs() {
  const { isNarrowWidth } = useResponsive();
  const { scrollY } = useScroll();
  const previousScrollY = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  const height = 70;

  useEffect(() => {
    if (previousScrollY.current != null && scrollY > previousScrollY.current) {
      if (isVisible) {
        setIsVisible(false);
      }
    } else {
      if (!isVisible) {
        setIsVisible(true);
      }
    }
    previousScrollY.current = scrollY;
  }, [scrollY]);

  return (
    <div
      style={{
        backgroundColor: theme.mobileNavBackground,
        borderTop: `1px solid ${theme.menuBorder}`,
        ...styles.shadow,
        display: isNarrowWidth ? 'flex' : 'none',
        height: height,
        justifyContent: 'space-around',
        paddingTop: 10,
        paddingBottom: 10,
        width: '100%',
        position: 'fixed',
        zIndex: 100,
        bottom: isVisible ? 0 : -height,
        transition: 'bottom 0.2s ease-out',
      }}
    >
      <NavTab name="Budget" path="/budget" icon={Wallet} />
      <NavTab name="Accounts" path="/accounts" icon={PiggyBank} />
      <NavTab name="Transaction" path="/transactions/new" icon={Add} />
      <NavTab name="Settings" path="/settings" icon={Cog} />
    </div>
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
};

function NavTab({ icon: TabIcon, name, path }: NavTabProps) {
  return (
    <NavLink
      to={path}
      style={({ isActive }) => ({
        alignItems: 'center',
        color: isActive ? theme.mobileNavItemSelected : theme.mobileNavItem,
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
      })}
    >
      <TabIcon width={22} height={22} />
      {name}
    </NavLink>
  );
}
