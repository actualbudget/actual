import { type MouseEventHandler, useState } from 'react';

import { useFeatureFlag } from './useFeatureFlag';

export function useContextMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [asContextMenu, setAsContextMenu] = useState(false);
  const [position, setPosition] = useState({ crossOffset: 0, offset: 0 });
  const contextMenusEnabled = useFeatureFlag('contextMenus');

  const handleContextMenu: MouseEventHandler<HTMLElement> = e => {
    if (!contextMenusEnabled) return;

    e.preventDefault();
    setAsContextMenu(true);

    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      crossOffset: e.clientX - rect.left,
      offset: e.clientY - rect.bottom,
    });
    setMenuOpen(true);
  };

  const resetPosition = (crossOffset = 0, offset = 0) => {
    setPosition({ crossOffset, offset });
  };

  return {
    menuOpen,
    setMenuOpen: (open: boolean) => {
      setMenuOpen(open);
      setAsContextMenu(false);
    },
    position,
    handleContextMenu,
    resetPosition,
    asContextMenu,
  };
}
