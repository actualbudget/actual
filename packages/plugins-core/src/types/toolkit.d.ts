import { ReactNode } from 'react';

import { ModalProps } from './props';

export type ActualPluginToolkitCommonComponents = {
  Modal: (props: ModalProps) => JSX.Element;
};

export type ActualPluginToolkitFunctions = {
  pushModal: (modalName: string, options?: unknown) => void;
};

export type ActualPluginToolkit = {
  functions: ActualPluginToolkitFunctions;
};
