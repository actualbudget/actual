import { createContext, useContext, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';

import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';

import { useRefEventListener } from '#hooks/useRefEventListener';

export type ContextMenuAction = {
  name: string;
  text: string;
  onClick: () => void;
  hidden?: boolean;
  disabled?: boolean;
};

type ContextMenuSection = typeof Menu.line | ContextMenuAction;

type ContextMenuContextData = {
  isOpen: boolean;
  addAction: (s: ContextMenuAction | typeof Menu.line) => void;
};

const ContextMenuContext = createContext<ContextMenuContextData>({
  isOpen: false,
  // oxlint-disable-next-line no-empty-function
  addAction: () => {},
});

export function ContextMenuContextProvider({
  children,
}: {
  children?: ReactNode;
}) {
  const [actions, setActions] = useState<ContextMenuSection[]>([]);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  // 1. Use a ref to collect actions synchronously during event bubbling
  const pendingActions = useRef<ContextMenuSection[]>([]);

  function addAction(action: ContextMenuSection) {
    if (
      typeof action === 'symbol' ||
      !pendingActions.current.some(
        pendingAction =>
          typeof pendingAction === 'object' &&
          pendingAction.name === action.name,
      )
    ) {
      pendingActions.current.push(action);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      setActions([]);
    }
  }

  // Handle right-clicks to OPEN or JUMP the menu
  useRefEventListener(
    document,
    'contextmenu',
    (e: MouseEvent) => {
      if (pendingActions.current.length === 0) {
        handleOpenChange(false);
        return;
      }

      e.preventDefault();
      setPosition({ x: e.clientX, y: e.clientY });
      setActions([...pendingActions.current]);
      setOpen(true);
      pendingActions.current = [];
    },
    [],
  );

  // 2. Handle left-clicks to DISMISS the menu
  useRefEventListener(
    document,
    'pointerdown',
    (e: PointerEvent) => {
      // Close the menu if we click anywhere outside the popover DOM element
      if (
        open &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        handleOpenChange(false);
      }
    },
    [open], // Re-bind when open state changes
  );

  function handleMenuSelect(actionName: string) {
    const action = actions.find(
      action => typeof action === 'object' && action.name === actionName,
    );
    if (action && typeof action === 'object') {
      action.onClick();
    }
    handleOpenChange(false);
  }

  return (
    <ContextMenuContext.Provider value={{ addAction, isOpen: open }}>
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
        isOpen={open}
        onOpenChange={handleOpenChange}
        placement="bottom start"
        isNonModal
        style={{ width: 200, margin: 1 }}
      >
        <Menu
          onMenuSelect={handleMenuSelect}
          items={actions}
          style={{ backgroundColor: theme.menuBackground }}
        />
      </Popover>
      {children}
    </ContextMenuContext.Provider>
  );
}

export function useConditionalContextMenuAction(
  triggerRef: RefObject<HTMLElement | null>,
  condition: unknown,
  ...actions: (
    | ContextMenuAction
    | typeof Menu.line
    | undefined
    | null
    | false
    | ''
  )[]
) {
  return useContextMenuAction(triggerRef, ...(condition ? actions : []));
}

export function useContextMenuAction(
  triggerRef: RefObject<HTMLElement | null>,
  ...actions: (
    | ContextMenuAction
    | typeof Menu.line
    | undefined
    | null
    | false
    | ''
  )[]
) {
  const { addAction, isOpen } = useContext(ContextMenuContext);
  useRefEventListener(
    triggerRef,
    'contextmenu',
    () => {
      for (const action of actions) {
        if (action && (typeof action === 'symbol' || !action.hidden)) {
          addAction(action);
        }
      }
    },
    [addAction, actions],
  );
  return { isOpen };
}

export function useContextMenuState() {
  const { isOpen } = useContext(ContextMenuContext);
  return { isOpen };
}
