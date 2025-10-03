import {
  MenuItemConstructorOptions,
  Menu,
  ipcMain,
  app,
  BrowserWindow,
} from 'electron';

export function getMenu(
  isDev: boolean,
  createWindow: () => Promise<void>,
  budgetId: string | undefined = undefined,
) {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'Hidden', // Kept purely for the keyboard shortcuts in Electron. Some shortcuts only work if they are in a menu (toggle devtools cannot be triggered in pure js).
      visible: false,
      submenu: [
        {
          label: 'Toggle Developer Tools',
          visible: false,
          accelerator:
            process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click(_item, focusedWindow) {
            if (focusedWindow) {
              const browserWindow = focusedWindow as BrowserWindow;
              browserWindow.webContents.toggleDevTools();
            }
          },
        },
        {
          label: 'Load Backup...',
          enabled: false,
          click(_item, focusedWindow) {
            if (focusedWindow && budgetId) {
              const browserWindow = focusedWindow as BrowserWindow;
              if (browserWindow.webContents.getTitle() === 'Actual') {
                browserWindow.webContents.executeJavaScript(
                  `__actionsForMenu.replaceModal({ modal: { name: 'load-backup', options: { budgetId: '${budgetId}' } } })`,
                );
              }
            }
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}
