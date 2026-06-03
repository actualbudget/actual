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
//. This is part of the full plugin support system that was removed from the initial bank sync MVP
/*
export { useReport } from './utils';
*/

// Query System (also needed on client-side for components)
//. This is part of the full plugin support system that was removed from the initial bank sync MVP
/*
export * from './query';
*/

// Spreadsheet types and utilities (client-side only)
//. This is part of the full plugin support system that was removed from the initial bank sync MVP
/*
export * from './spreadsheet';
*/

// Client-side plugin types
export type {
  ActualPlugin,
  ActualPluginInitialized,
  BankSyncProviderSetupCallProvider,
  BankSyncProviderExternalAccount,
  BankSyncProviderLinkRenderer,
  BankSyncProviderLinkRenderProps,
  BankSyncProviderSetupRenderer,
  BankSyncProviderSetupRenderProps,
  BankSyncProviderSetupSetSecret,
  HostContext,
} from './types/actualPlugin';

//. This is part of the full plugin support system that was removed from the initial bank sync MVP
/*
export type { ThemeColorTypes } from './types/actualPlugin';
*/

export type * from '@actual-app/shared-types/modalProps';

//. This is part of the full plugin support system that was removed from the initial bank sync MVP
/*
export type {
  ActualPluginToolkit,
  ActualPluginToolkitFunctions,
} from './types/toolkit';
*/
