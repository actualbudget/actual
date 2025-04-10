import { ReactNode } from 'react';

import { BasicModalProps } from '@actual-app/components/props/modalProps';

export type ActualPluginToolkitCommonComponents = {
  Modal: (props: BasicModalProps) => JSX.Element;
};

export type ActualPluginToolkitFunctions = {
  pushModal: (modalName: string, options?: unknown) => void;
};

export type ActualPluginToolkit = {
  functions: ActualPluginToolkitFunctions;
};
