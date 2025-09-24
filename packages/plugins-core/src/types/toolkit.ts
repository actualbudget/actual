export type ActualPluginToolkitFunctions = {
  pushModal: (modalName: string, options?: unknown) => void;
};

export type ActualPluginToolkit = {
  functions: ActualPluginToolkitFunctions;
};
