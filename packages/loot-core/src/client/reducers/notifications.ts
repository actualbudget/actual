// @ts-strict-ignore
import * as constants from '../constants';
import type { Action } from '../state-types';
import type { NotificationsState } from '../state-types/notifications';

const initialState = {
  notifications: [],
  inset: {},
};

export function update(
  state = initialState,
  action: Action,
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
