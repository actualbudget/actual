export default async function checkForUpdateNotification(
  addNotification,
  getIsOutdated,
  getLatestVersion,
  loadPrefs,
  savePrefs
) {
  let isOutdated = await getIsOutdated();
  let latestVersion = await getLatestVersion();
  if (
    !isOutdated ||
    (await loadPrefs())['flags.updateNotificationShownForVersion'] ==
      latestVersion
  ) {
    return;
  }

  await savePrefs({
    'flags.updateNotificationShownForVersion': latestVersion
  });
  addNotification({
    type: 'message',
    title: 'A new version of Actual is available!',
    message: `Version ${latestVersion} of Actual was recently released.`,
    sticky: true,
    id: 'update-notification',
    button: {
      title: 'Open changelog',
      action: () => {
        window.open('https://actualbudget.com/release-notes');
      }
    }
  });
}
