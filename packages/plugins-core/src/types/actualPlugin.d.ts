export interface ActualPlugin {
  name: string;
  version: string;
  uninstall: (db: IDBDatabase) => void;
  activate: (
    context: Omit<HostContext, 'registerSidebarMenu' | 'pushModal'> & {
      registerSidebarMenu: (element: JSX.Element) => string;
      pushModal: (element: JSX.Element) => void;
    },
  ) => void;
}

export type ActualPluginInitialized = Omit<ActualPlugin, 'activate'> & {
  initialized: true;
  activate: (context: HostContext) => void;
};

interface ContextEvent {
  sync: { success: boolean };
  'account-add': { transaction: unknown }; //move type transaction entity from loot-core
  //... other events
}

export interface HostContext {
  navigate: (routePath: string) => void;
  
  pushModal: (parameter: (container: HTMLDivElement) => void) => void;

  registerRoute: (path: string, routeElement: JSX.Element) => string;
  unregisterRoute: (id: string) => void;

  registerSidebarMenu: (
    parameter: (container: HTMLDivElement) => void,
  ) => string;
  unregisterSidebarMenu: (id: string) => void;

  on: <K extends keyof ContextEvent>(
    eventType: K,
    callback: (data: ContextEvent[K]) => void,
  ) => void;
}
