import {
  app,
  Menu,
  type BrowserWindow,
  type MenuItemConstructorOptions,
} from 'electron';

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
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          enabled: false,
          accelerator: 'CmdOrCtrl+Z',
          click: function (_menuItem, focusedWin) {
            // Undo
            if (focusedWin) {
              (focusedWin as BrowserWindow).webContents.executeJavaScript(
                '__actionsForMenu.undo()',
              );
            }
          },
        },
        {
          label: 'Redo',
          enabled: false,
          accelerator: 'Shift+CmdOrCtrl+Z',
          click: function (_menuItem, focusedWin) {
            // Redo
            if (focusedWin) {
              (focusedWin as BrowserWindow).webContents.executeJavaScript(
                '__actionsForMenu.redo()',
              );
            }
          },
        },
        {
          type: 'separator',
        },
        {
          role: 'cut',
        },
        {
          role: 'copy',
        },
        {
          role: 'paste',
        },
        {
          role: 'pasteAndMatchStyle',
        },
        {
          role: 'delete',
        },
        {
          role: 'selectAll',
        },
      ],
    },
    {
      role: 'window',
      submenu: [
        {
          role: 'minimize',
        },
      ],
    },
  ];

  if (process.platform === 'darwin') {
    // Mac specific menu
    const name = app.getName();
    template.unshift({
      label: name,
      submenu: [
        {
          role: 'hide',
        },
        {
          role: 'hideOthers',
        },
        {
          role: 'unhide',
        },
        {
          type: 'separator',
        },
        {
          role: 'quit',
        },
      ],
    });

    // Window menu
    const windowIdx = template.findIndex(t => t.role === 'window');
    template[windowIdx].submenu = [
      {
        label: 'Close',
        accelerator: 'CmdOrCtrl+W',
        role: 'close',
      },
      {
        label: 'Minimize',
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize',
      },
      {
        label: 'Zoom',
        role: 'zoom',
      },
      {
        type: 'separator',
      },
      {
        label: 'Bring All to Front',
        role: 'front',
      },
    ];
  }

  return Menu.buildFromTemplate(template);
}
