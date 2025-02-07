import type * as constants from '../constants';

export type Notification = {
  id?: string | undefined;
  // 'warning' is unhandled??
  type?: 'message' | 'error' | 'warning';
  pre?: string | undefined;
  title?: string | undefined;
  message: string;
  sticky?: boolean | undefined;
  timeout?: number | undefined;
  button?:
    | {
        title: string;
        action: () => void | Promise<void>;
      }
    | undefined;
  messageActions?: Record<string, () => void> | undefined;
  onClose?: (() => void) | undefined;
  internal?: string | undefined;
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
