import i18n from 'i18next';

// @ts-strict-ignore
export async function checkForUpdateNotification(
  addNotification,
  getIsOutdated,
  getLatestVersion,
  loadPrefs,
  savePrefs,
) {
  const latestVersion = await getLatestVersion();
  const isOutdated = await getIsOutdated(latestVersion);
  if (
    !isOutdated ||
    (await loadPrefs())['flags.updateNotificationShownForVersion'] ===
      latestVersion
  ) {
    return;
  }

  addNotification({
    type: 'message',
    title: i18n.t('A new version of Actual is available!'),
    message: i18n.t(
      'Version {{latestVersion}} of Actual was recently released.',
      { latestVersion },
    ),
    sticky: true,
    id: 'update-notification',
    button: {
      title: i18n.t('Open changelog'),
      action: () => {
        window.open('https://actualbudget.org/docs/releases');
      },
    },
    onClose: async () => {
      await savePrefs({
        'flags.updateNotificationShownForVersion': latestVersion,
      });
    },
  });
}
