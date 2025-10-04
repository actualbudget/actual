import { MenuItemConstructorOptions, Menu, BrowserWindow } from 'electron';

export function getMenu() {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File', // Kept purely for the keyboard shortcuts in Electron. Some shortcuts only work if they are in a menu (toggle devtools cannot be triggered in pure js).
      submenu: [
        {
          label: 'Exit',
          click(_item, focusedWindow) {
            if (focusedWindow) {
              const browserWindow = focusedWindow as BrowserWindow;
              browserWindow.close();
            }
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click(_item, focusedWindow) {
            if (focusedWindow) {
              const browserWindow = focusedWindow as BrowserWindow;
              browserWindow.reload();
            }
          },
        },
        {
          label: 'Toggle Developer Tools',
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
          type: 'separator',
        },
        {
          role: 'resetZoom',
        },
        {
          role: 'zoomIn',
        },
        {
          role: 'zoomOut',
        },
        {
          type: 'separator',
        },
        {
          role: 'togglefullscreen',
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}
