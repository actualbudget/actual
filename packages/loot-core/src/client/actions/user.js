import { send } from '../../platform/client/fetch';
import constants from '../constants';

import { loadAllFiles, closeBudget } from './budgets';
import { loadGlobalPrefs } from './prefs';

export function getUserData() {
  return async dispatch => {
    const data = await send('subscribe-get-user');

    dispatch({
      type: constants.GET_USER_DATA,
      data
    });
    return data;
  };
}

export function loggedIn() {
  return async dispatch => {
    await dispatch(getUserData());

    // We want to be careful about how we call loadAllFiles. It will
    // turn the files state from null into an array, indicating that
    // we've loaded the files at least once. This first attempt at
    // loading files is important - the manager uses files to decide
    // if it should create a new file automatically (if there are no
    // files). If we call it before we have a properly logged in
    // user, later on it could trigger the codepath which
    // automatically creates a file, but we really haven't loaded
    // their files yet.
    //
    // Since the above comment was written, We let in users even if
    // their account is invalid. So we should list all their files
    // regardless. Previously, we kicked users out to a "need payment
    // info" screen and we didn't want to call this.
    dispatch(loadAllFiles());
  };
}

export function signOut() {
  return async dispatch => {
    await send('subscribe-sign-out');

    dispatch(getUserData());
    dispatch(loadGlobalPrefs());
    dispatch(closeBudget());
    dispatch({ type: constants.SIGN_OUT });
  };
}
