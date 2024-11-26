export type Notification = {
  id?: string;
  // 'warning' is unhandled??
  type?: 'message' | 'error' | 'warning';
  pre?: string;
  title?: string;
  message: string;
  sticky?: boolean;
  timeout?: number;
  button?: {
    title: string;
    action: () => void | Promise<void>;
  };
  messageActions?: Record<string, () => void>;
  onClose?: () => void;
  internal?: string;
};
export type NotificationWithId = Notification & { id: string };
