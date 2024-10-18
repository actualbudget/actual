// @ts-strict-ignore
import type { NotificationsActions } from './actions/notifications';
import * as constants from './constants';

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

export type NotificationsState = {
  notifications: NotificationWithId[];
  inset?: {
    bottom?: number;
    top?: number;
    right?: number;
    left?: number;
  };
};

const initialState: NotificationsState = {
  notifications: [],
  inset: {},
};

export function update(
  state = initialState,
  action: NotificationsActions,
): NotificationsState {
  switch (action.type) {
    case constants.ADD_NOTIFICATION:
      if (state.notifications.find(n => n.id === action.notification.id)) {
        return state;
      }

      return {
        ...state,
        notifications: [...state.notifications, action.notification],
      };
    case constants.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.id),
      };
    case constants.SET_NOTIFICATION_INSET:
      return {
        ...state,
        inset: action.inset,
      };
    default:
  }

  return state;
}
