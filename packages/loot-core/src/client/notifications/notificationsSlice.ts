import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { t } from 'i18next';
import { v4 as uuidv4 } from 'uuid';

const sliceName = 'notifications';

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

type NotificationsState = {
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

type AddNotificationPayload = {
  notification: Notification;
};
type RemoveNotificationPayload = {
  id: NotificationWithId['id'];
};
type SetNotificationInsetPayload = {
  inset: NotificationsState['inset'];
} | null;

const notificationsSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    addNotification(state, action: PayloadAction<AddNotificationPayload>) {
      const notification = {
        ...action.payload.notification,
        id: action.payload.notification.id || uuidv4(),
      };

      if (state.notifications.find(n => n.id === notification.id)) {
        return;
      }
      state.notifications = [...state.notifications, notification];
    },
    addGenericErrorNotification() {
      addNotification({
        notification: {
          type: 'error',
          message: t(
            'Something internally went wrong. You may want to restart the app if anything looks wrong. ' +
              'Please report this as a new issue on GitHub.',
          ),
        },
      });
    },
    removeNotification(
      state,
      action: PayloadAction<RemoveNotificationPayload>,
    ) {
      state.notifications = state.notifications.filter(
        notif => notif.id !== action.payload.id,
      );
    },
    setNotificationInset(
      state,
      action: PayloadAction<SetNotificationInsetPayload>,
    ) {
      state.inset = action.payload?.inset ? action.payload.inset : {};
    },
  },
});

export const { name, reducer, getInitialState } = notificationsSlice;

export const actions = {
  ...notificationsSlice.actions,
};

export const {
  addGenericErrorNotification,
  addNotification,
  removeNotification,
  setNotificationInset,
} = actions;
