export default async function checkForUpdateNotification(
  addNotification,
  getIsOutdated,
  getLatestVersion,
  loadPrefs,
  savePrefs,
) {
  let latestVersion = await getLatestVersion();
  let isOutdated = await getIsOutdated(latestVersion);
  if (
    !isOutdated ||
    (await loadPrefs())['flags.updateNotificationShownForVersion'] ===
      latestVersion
  ) {
    return;
  }

  addNotification({
    type: 'message',
    title: 'A new version of Actual is available!',
    message: `Version ${latestVersion} of Actual was recently released.`,
    sticky: true,
    id: 'update-notification',
    button: {
      title: 'Open changelog',
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
