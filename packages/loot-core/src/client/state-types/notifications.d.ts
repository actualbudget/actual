import type * as constants from '../constants';

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
type NotificationWithId = Notification & { id: string };

export type NotificationsState = {
  notifications: NotificationWithId[];
  inset?: {
    bottom?: number;
    top?: number;
    right?: number;
    left?: number;
  };
};

type AddNotificationAction = {
  type: typeof constants.ADD_NOTIFICATION;
  notification: NotificationWithId;
};

type RemoveNotificationAction = {
  type: typeof constants.REMOVE_NOTIFICATION;
  id: string;
};

type SetNotificationInsetAction = {
  type: typeof constants.SET_NOTIFICATION_INSET;
  inset: {
    bottom?: number;
    top?: number;
    right?: number;
    left?: number;
  };
};

export type NotificationsActions =
  | AddNotificationAction
  | RemoveNotificationAction
  | SetNotificationInsetAction;
