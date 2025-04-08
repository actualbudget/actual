import type { BasicModalProps } from '@actual-app/components/props/modalProps';

export type SidebarLocations =
  | 'main-menu'
  | 'more-menu'
  | 'before-accounts'
  | 'after-accounts'
  | 'topbar';

export interface ActualPlugin {
  name: string;
  version: string;
  uninstall: () => void;
  activate: (
    context: Omit<HostContext, 'registerMenu' | 'pushModal' | 'registerRoute'> & {
      registerMenu: (
        location: SidebarLocations,
        element: JSX.Element,
      ) => string;
      pushModal: (element: JSX.Element, modalProps?: BasicModalProps) => void;
      registerRoute: (path: string, routeElement: JSX.Element) => string;
    },
  ) => void;
}

export type ActualPluginInitialized = Omit<ActualPlugin, 'activate'> & {
  initialized: true;
  activate: (context: HostContext) => void;
};

export interface ContextEvent {
  payess: { payess: unknown[] };
  categories: { categories: unknown[], groups: unknown[] };
  accounts: { accounts: unknown[] };
}

export interface HostContext {
  navigate: (routePath: string) => void;

  pushModal: (
    parameter: (container: HTMLDivElement) => void,
    modalProps?: BasicModalProps,
  ) => void;
  popModal: () => void;

  registerRoute: (path: string, routeElement: (container: HTMLDivElement) => void) => string;
  unregisterRoute: (id: string) => void;

  registerMenu: (
    location: SidebarLocations,
    parameter: (container: HTMLDivElement) => void,
  ) => string;
  unregisterMenu: (id: string) => void;

  on: <K extends keyof ContextEvent>(
    eventType: K,
    callback: (data: ContextEvent[K]) => void,
  ) => void;
}
