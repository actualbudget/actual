import { createContext, useContext, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Popover } from 'react-aria-components';

import { Menu } from '@actual-app/components/menu';

import { useRefEventListener } from '#hooks/useRefEventListener';

type Action = string;

type ContextMenuContextData = {
  addAction: (s: Action) => void;
};

const ContextMenuContext = createContext<ContextMenuContextData>({
  // oxlint-disable-next-line no-empty-function
  addAction: () => {},
});

export function ContextMenuContextProvider({
  children,
}: {
  children?: ReactNode;
}) {
  const [actions, setActions] = useState<Action[]>([]);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  // 1. Use a ref to collect actions synchronously during event bubbling
  const pendingActions = useRef<Action[]>([]);

  function addAction(action: Action) {
    pendingActions.current.push(action);
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
  return (
    <ContextMenuContext.Provider value={{ addAction }}>
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
          onMenuSelect={() => handleOpenChange(false)}
          items={actions.map(action => ({ name: action, text: action }))}
        />
      </Popover>
      {children}
    </ContextMenuContext.Provider>
  );
}

export function useContextMenuAction(
  triggerRef: RefObject<HTMLElement | null>,
  action: Action,
) {
  const { addAction } = useContext(ContextMenuContext);
  useRefEventListener(
    triggerRef,
    'contextmenu',
    () => {
      console.log(action);
      addAction(action);
    },
    [addAction, action],
  );
}
