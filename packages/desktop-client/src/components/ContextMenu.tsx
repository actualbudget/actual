import { createContext, useContext, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';

import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import _ from 'lodash';

import { useRefEventListener } from '#hooks/useRefEventListener';

export type ContextMenuLabel = {
  type: typeof Menu.label;
  name: string;
  text: string;
  hidden?: boolean;
  order?: number;
};

export type ContextMenuOrderedLine = {
  type: typeof Menu.line;
  order: number;
  hidden?: boolean;
};

export type ContextMenuAction = {
  name: string;
  text: string;
  hidden?: boolean;
  order?: number;
  onClick: () => void;
};

type MenuItem = ContextMenuAction | ContextMenuLabel | typeof Menu.line;

export type ContextMenuItem = MenuItem | ContextMenuOrderedLine;

type ContextMenuActionContextData = {
  addItem: (s: ContextMenuItem) => void;
};

const ContextMenuActionContext = createContext<ContextMenuActionContextData>({
  // oxlint-disable-next-line no-empty-function
  addItem: () => {},
});

type ContextMenuStateContextData = {
  position: { x: number; y: number };
  isOpen: boolean;
};

const ContextMenuStateContext = createContext<ContextMenuStateContextData>({
  position: { x: 0, y: 0 },
  isOpen: false,
});

export function ContextMenuContextProvider({
  children,
}: {
  children?: ReactNode;
}) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  // 1. Use a ref to collect actions synchronously during event bubbling
  const pendingItems = useRef<ContextMenuItem[]>([]);

  function addItem(item: ContextMenuItem) {
    pendingItems.current.push(item);
  }

  function handleOpenChange(newOpen: boolean) {
    setIsOpen(newOpen);
    if (!newOpen) {
      setItems([]);
    }
  }

  // Handle right-clicks to OPEN or JUMP the menu
  useRefEventListener(document, 'contextmenu', (e: MouseEvent) => {
    if (pendingItems.current.length === 0) {
      handleOpenChange(false);
      return;
    }

    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    const sortedItems = _.orderBy(
      pendingItems.current,
      a => (typeof a === 'object' && 'order' in a && a.order) || 0,
      'asc',
    );
    setItems(
      sortedItems.map(item =>
        typeof item === 'object' && 'type' in item && item.type === Menu.line
          ? Menu.line
          : item,
      ),
    );
    setIsOpen(true);
    pendingItems.current = [];
  });

  // 2. Handle left-clicks to DISMISS the menu
  useRefEventListener(document, 'pointerdown', (e: PointerEvent) => {
    // Close the menu if we click anywhere outside the popover DOM element
    if (
      isOpen &&
      popoverRef.current &&
      !popoverRef.current.contains(e.target as Node)
    ) {
      handleOpenChange(false);
    }
  });

  function handleMenuSelect(itemName: string) {
    const item = items.find(
      action =>
        typeof action === 'object' &&
        'onClick' in action &&
        action.name === itemName,
    );
    if (item && typeof item === 'object' && 'onClick' in item) {
      item.onClick();
    }
    handleOpenChange(false);
  }

  return (
    <ContextMenuActionContext.Provider value={{ addItem }}>
      <ContextMenuStateContext.Provider value={{ position, isOpen }}>
        {/* THE INVISIBLE ANCHOR:
          A 0x0 pixel real DOM node that follows your right-clicks.
        */}
        <div
          ref={triggerRef}
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            width: 0,
            height: 0,
            pointerEvents: 'none', // Prevents it from interfering with user clicks
          }}
        />

        <Popover
          ref={popoverRef}
          triggerRef={triggerRef}
          isOpen={isOpen}
          onOpenChange={handleOpenChange}
          placement="bottom start"
          isNonModal
          style={{ width: 200, margin: 1 }}
        >
          <Menu
            onMenuSelect={handleMenuSelect}
            items={items}
            style={{ backgroundColor: theme.menuBackground }}
          />
        </Popover>
        {children}
      </ContextMenuStateContext.Provider>
    </ContextMenuActionContext.Provider>
  );
}

type Falsy<T> = T | undefined | null | false | '';

export function useConditionalContextMenuAction(
  triggerRef: RefObject<HTMLElement | null>,
  condition: unknown,
  ...actions: Falsy<ContextMenuItem>[]
) {
  return useContextMenuAction(triggerRef, ...(condition ? actions : []));
}

export function useContextMenuAction(
  triggerRef: RefObject<HTMLElement | null>,
  ...actions: Falsy<ContextMenuItem>[]
) {
  const { addItem: addAction } = useContext(ContextMenuActionContext);
  function addActions() {
    for (const action of actions) {
      if (action && (typeof action === 'symbol' || !action.hidden)) {
        addAction(action);
      }
    }
  }

  useRefEventListener(triggerRef, 'contextmenu', addActions);
  function handleContextMenu() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    triggerRef.current.dispatchEvent(
      new MouseEvent('contextmenu', {
        clientX: rect.x,
        clientY: rect.y + rect.height,
        bubbles: true,
      }),
    );
  }
  return { handleContextMenu };
}

export function useContextMenuState() {
  const { isOpen } = useContext(ContextMenuStateContext);
  return { isOpen };
}
