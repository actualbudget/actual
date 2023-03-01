export default async function checkForUpdateNotification(
  addNotification,
  getIsOutdated
) {
  let isOutdated = await getIsOutdated();
  if (!isOutdated) return;
  addNotification({
    type: 'message',
    title: 'A new version of Actual is available!',
    message: 'Click here to learn more',
    sticky: true,
    id: 'update-notification',
    button: {
      title: 'Open changelog',
      action: () => {
        window.open('https://actualbudget.github.io/docs/Release-Notes');
      }
    }
  });
}
