import * as constants from '../constants';

const initialState = {
  notifications: [],
};

export default function update(state = initialState, action) {
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
    default:
  }

  return state;
}
