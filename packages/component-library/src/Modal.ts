import { type CSSProperties } from 'react';

export type BasicModalProps = {
  isLoading?: boolean;
  noAnimation?: boolean;
  style?: CSSProperties;
  onClose?: () => void;
  containerProps?: {
    style?: CSSProperties;
  };
};
