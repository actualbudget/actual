import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { t } from 'i18next';
import { v4 as uuidv4 } from 'uuid';

const sliceName = 'notifications';

export type Notification = {
  id?: string | undefined;
  type: 'message' | 'error' | 'warning';
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

type AddNotificationPayload = Notification;
type RemoveNotificationPayload = NotificationWithId['id'];
type SetNotificationInsetPayload = NotificationsState['inset'];

const notificationsSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    addNotification(state, action: PayloadAction<AddNotificationPayload>) {
      const notification = {
        ...action.payload,
        id: action.payload.id || uuidv4(),
      };

      if (state.notifications.find(n => n.id === notification.id)) {
        return;
      }
      state.notifications = [...state.notifications, notification];
    },
    addGenericErrorNotification() {
      addNotification({
        type: 'error',
        message: t(
          'Something internally went wrong. You may want to restart the app if anything looks wrong. ' +
            'Please report this as a new issue on GitHub.',
        ),
      });
    },
    removeNotification(
      state,
      action: PayloadAction<RemoveNotificationPayload>,
    ) {
      state.notifications = state.notifications.filter(
        notif => notif.id !== action.payload,
      );
    },
    setNotificationInset(
      state,
      action: PayloadAction<SetNotificationInsetPayload>,
    ) {
      state.inset = action.payload ? action.payload : {};
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
