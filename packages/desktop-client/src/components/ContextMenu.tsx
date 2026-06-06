import { createContext, useContext, useRef, useState } from 'react';
import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react';

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

export type ContextMenuAction = {
  name: string;
  text: string;
  hidden?: boolean;
  order?: number;
  onClick: () => void;
};

export type ContextMenuSection =
  | typeof Menu.line
  | ContextMenuAction
  | ContextMenuLabel;

type ContextMenuContextData = {
  position: { x: number; y: number };
  setPosition: Dispatch<SetStateAction<{ x: number; y: number }>>;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  addAction: (
    s: ContextMenuAction | typeof Menu.line | ContextMenuLabel,
  ) => void;
};

const ContextMenuContext = createContext<ContextMenuContextData>({
  position: { x: 0, y: 0 },
  // oxlint-disable-next-line no-empty-function
  setPosition: () => {},
  isOpen: false,
  // oxlint-disable-next-line no-empty-function
  setIsOpen: () => {},
  // oxlint-disable-next-line no-empty-function
  addAction: () => {},
});

export function ContextMenuContextProvider({
  children,
}: {
  children?: ReactNode;
}) {
  const [actions, setActions] = useState<ContextMenuSection[]>([]);
  const [isOpen, setIsOpen] = useState(false);
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
    setIsOpen(newOpen);
    if (!newOpen) {
      setActions([]);
    }
  }

  // Handle right-clicks to OPEN or JUMP the menu
  useRefEventListener(document, 'contextmenu', (e: MouseEvent) => {
    if (pendingActions.current.length === 0) {
      handleOpenChange(false);
      return;
    }

    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setActions(
      _.orderBy(
        pendingActions.current,
        a => (typeof a === 'object' && 'order' in a && a.order) || 0,
        'asc',
      ),
    );
    setIsOpen(true);
    pendingActions.current = [];
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

  function handleMenuSelect(actionName: string) {
    const action = actions.find(
      action => typeof action === 'object' && action.name === actionName,
    );
    if (action && typeof action === 'object' && 'onClick' in action) {
      action.onClick();
    }
    handleOpenChange(false);
  }

  return (
    <ContextMenuContext.Provider
      value={{ position, setPosition, setIsOpen, isOpen, addAction }}
    >
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
          items={actions}
          style={{ backgroundColor: theme.menuBackground }}
        />
      </Popover>
      {children}
    </ContextMenuContext.Provider>
  );
}

type Falsy<T> = T | undefined | null | false | '';

export function useConditionalContextMenuAction(
  triggerRef: RefObject<HTMLElement | null>,
  condition: unknown,
  ...actions: Falsy<ContextMenuSection>[]
) {
  return useContextMenuAction(triggerRef, ...(condition ? actions : []));
}

export function useContextMenuAction(
  triggerRef: RefObject<HTMLElement | null>,
  ...actions: Falsy<ContextMenuSection>[]
) {
  const { addAction, isOpen } = useContext(ContextMenuContext);
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
  return { isOpen, handleContextMenu };
}

export function useContextMenuState() {
  const { isOpen } = useContext(ContextMenuContext);
  return { isOpen };
}
