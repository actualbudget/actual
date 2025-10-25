// Modal Components (client-side only)
export {
  ModalTitle,
  ModalButtons,
  ModalHeader,
  ModalCloseButton,
} from './BasicModalComponents';

// Client-side middleware
export { initializePlugin } from './middleware';

// Icons, styles, theme (client-side only)
export * from '@actual-app/components';

// Client-side hooks (React hooks)
export { useReport } from './utils';

// Query System (also needed on client-side for components)
export * from '@actual-app/query';

// Spreadsheet types and utilities (client-side only)
export * from '@actual-app/shared-types/spreadsheet';

// Client-side plugin types
export type {
  ActualPlugin,
  ActualPluginInitialized,
  ThemeColorTypes,
  HostContext,
} from './types/actualPlugin';

export type * from '@actual-app/components/props/modalProps';

export type {
  ActualPluginToolkit,
  ActualPluginToolkitFunctions,
} from './types/toolkit';
