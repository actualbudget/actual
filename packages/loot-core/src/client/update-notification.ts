import { t } from 'i18next';

import { addNotification, loadPrefs, savePrefs } from './actions';
import { type Dispatch } from './actions/types';

export async function checkForUpdateNotification(
  dispatch: Dispatch,
  getIsOutdated: (latestVersion: string) => Promise<boolean>,
  getLatestVersion: () => Promise<string>,
) {
  const latestVersion = await getLatestVersion();
  const isOutdated = await getIsOutdated(latestVersion);
  if (
    !isOutdated ||
    (await dispatch(loadPrefs()))['flags.updateNotificationShownForVersion'] ===
      latestVersion
  ) {
    return;
  }

  dispatch(
    addNotification({
      type: 'message',
      title: t('A new version of Actual is available!'),
      message: t('Version {{latestVersion}} of Actual was recently released.', {
        latestVersion,
      }),
      sticky: true,
      id: 'update-notification',
      button: {
        title: t('Open changelog'),
        action: () => {
          window.open('https://actualbudget.org/docs/releases');
        },
      },
      onClose: () => {
        dispatch(
          savePrefs({
            'flags.updateNotificationShownForVersion': latestVersion,
          }),
        );
      },
    }),
  );
}
