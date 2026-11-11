import React from 'react';

import { useLocation } from '@docusaurus/router';
import DropdownNavbarItem from '@theme/NavbarItem/DropdownNavbarItem';

export default function VersionDropdownNavbarItem({ items, ...props }) {
  const { pathname } = useLocation();

  return (
    <DropdownNavbarItem
      {...props}
      items={items.map(item =>
        item.href ? { ...item, href: new URL(pathname, item.href).href } : item,
      )}
    />
  );
}
