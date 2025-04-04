import { ComponentPropsWithRef, CSSProperties } from 'react';
import { Modal as ReactAriaModal } from 'react-aria-components';

export type ModalProps = ComponentPropsWithRef<typeof ReactAriaModal> & {
  name: string;
  isLoading?: boolean;
  noAnimation?: boolean;
  style?: CSSProperties;
  onClose?: () => void;
  containerProps?: {
    style?: CSSProperties;
  };
};
