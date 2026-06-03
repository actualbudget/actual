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
export { Button, ButtonWithLoading } from '@actual-app/components/button';
export { Input } from '@actual-app/components/input';
export { SvgLogo } from '@actual-app/components/icons/logo';
export { styles } from '@actual-app/components/styles';
export type { CSSProperties } from '@actual-app/components/styles';
export { theme } from '@actual-app/components/theme';
export { View } from '@actual-app/components/view';

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
export type { ActualPluginEntry } from './types/actualPluginEntry';
export {
  isFrontendPlugin,
  isSyncServerPlugin,
  validateActualPluginManifest,
} from './types/actualPluginManifest';
export type {
  ActualPluginManifest,
  ActualPluginType,
  ActualPluginFrontendManifest,
  ActualPluginSyncServerManifest,
} from './types/actualPluginManifest';

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
