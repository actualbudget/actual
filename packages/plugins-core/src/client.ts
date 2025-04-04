// React Components (client-side only)
export { AlignedText } from '@actual-app/components/aligned-text';
export { Block } from '@actual-app/components/block';
export { Button, ButtonWithLoading } from '@actual-app/components/button';
export { Card } from '@actual-app/components/card';
export { FormError } from '@actual-app/components/form-error';
export { InitialFocus } from '@actual-app/components/initial-focus';
export { InlineField } from '@actual-app/components/inline-field';
export { Input } from '@actual-app/components/input';
export { Label } from '@actual-app/components/label';
export { Menu } from '@actual-app/components/menu';
export { Paragraph } from '@actual-app/components/paragraph';
export { Popover } from '@actual-app/components/popover';
export { Select } from '@actual-app/components/select';
export { SpaceBetween } from '@actual-app/components/space-between';
export { Stack } from '@actual-app/components/stack';
export { Text } from '@actual-app/components/text';
export { TextOneLine } from '@actual-app/components/text-one-line';
export { Toggle } from '@actual-app/components/toggle';
export { Tooltip } from '@actual-app/components/tooltip';
export { View } from '@actual-app/components/view';

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
export * from '@actual-app/components/icons/v2';
export * from '@actual-app/components/styles';
export * from '@actual-app/components/theme';

// Client-side hooks (React hooks)
export { useReport } from './utils';

// Query System (also needed on client-side for components)
export {
  Query,
  q,
  getPrimaryOrderBy,
  type QueryState,
  type QueryBuilder,
  type ObjectExpression,
} from './query';

// Spreadsheet types and utilities (client-side only)
export {
  parametrizedField,
  type SheetFields,
  type Binding,
  type SheetNames,
  type Spreadsheets,
  type BindingObject,
} from './spreadsheet';

// Client-side plugin types
export type {
  ActualPlugin,
  ActualPluginInitialized,
  ThemeColorOverrides,
  HostContext,
} from './types/actualPlugin';

export type { BasicModalProps } from '@actual-app/components/props/modalProps';
export type {
  ActualPluginToolkit,
  ActualPluginToolkitFunctions,
} from './types/toolkit';
