import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import type {
  DropPosition,
  OnDragChangeCallback,
  OnDropCallback,
} from '#hooks/useDragDrop';

export type SidebarDragScope = {
  dragType: string;
  canDrag: boolean;
  onDragChange: OnDragChangeCallback<{ id: string }>;
  onDrop: OnDropCallback;
  onDropTargetOver: (
    targetId: string,
    zoneId: string | undefined,
    pos: DropPosition,
  ) => void;
  activeDropPos: (targetId: string) => DropPosition | null;
  isDropZoneHighlighted: (zoneId: string) => boolean;
};

const SidebarDragScopeContext = createContext<SidebarDragScope | null>(null);

type SidebarDragScopeProviderProps = {
  scope: SidebarDragScope;
  children: ReactNode;
};

export function SidebarDragScopeProvider({
  scope,
  children,
}: SidebarDragScopeProviderProps) {
  return (
    <SidebarDragScopeContext.Provider value={scope}>
      {children}
    </SidebarDragScopeContext.Provider>
  );
}

export function useSidebarDragScope(): SidebarDragScope {
  const scope = useContext(SidebarDragScopeContext);
  if (scope == null) {
    throw new Error(
      'useSidebarDragScope must be used within a SidebarDragScopeProvider',
    );
  }
  return scope;
}
