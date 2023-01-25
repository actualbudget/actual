import { send } from '../../platform/client/fetch';
import Platform from '../platform';

import { pushModal } from './modals';

export function startTutorialFirstTime() {
  return (dispatch, getState) => {
    let { seenTutorial } = getState().prefs.global;

    if (!seenTutorial) {
      send('set-tutorial-seen');
      if (Platform.env === 'web') {
        setTimeout(() => {
          dispatch(pushModal('welcome-screen'));
        }, 500);

        return true;
      }
    }
    return false;
  };
}
