import { MenuItemConstructorOptions, Menu, ipcMain, app } from 'electron';

export function getMenu(
  isDev: boolean,
  createWindow: () => Promise<void>,
  budgetId: string | undefined = undefined,
) {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Load Backup...',
          enabled: false,
          click(_item, focusedWindow) {
            if (focusedWindow && budgetId) {
              if (focusedWindow.webContents.getTitle() === 'Actual') {
                focusedWindow.webContents.executeJavaScript(
                  `__actionsForMenu.replaceModal({ modal: { name: 'load-backup', options: { budgetId: '${budgetId}' } } })`,
                );
              }
            }
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Manage files...',
          accelerator: 'CmdOrCtrl+O',
          click(_item, focusedWindow) {
            if (focusedWindow) {
              if (focusedWindow.webContents.getTitle() === 'Actual') {
                focusedWindow.webContents.executeJavaScript(
                  '__actionsForMenu.closeBudget()',
                );
              } else {
                focusedWindow.close();
              }
            } else {
              // The default page is the budget list
              createWindow();
            }
          },
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
              focusedWin.webContents.executeJavaScript(
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
              focusedWin.webContents.executeJavaScript(
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
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click(_item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.reload();
            }
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator:
            process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click(_item, focusedWindow) {
            if (focusedWindow) focusedWindow.webContents.toggleDevTools();
          },
        },
        isDev
          ? {
              type: 'separator',
            }
          : { label: 'hidden', visible: false },
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
      label: 'Tools',
      submenu: [
        {
          label: 'Find schedules',
          enabled: false,
          click: function (_menuItem, focusedWin) {
            if (focusedWin) {
              focusedWin.webContents.executeJavaScript(
                'window.__actionsForMenu && window.__actionsForMenu.pushModal({ modal: { name: "schedules-discover" } })',
              );
            }
          },
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
    {
      role: 'help',
      submenu: [
        {
          label: 'Documentation',
          click(_menuItem, focusedWin) {
            focusedWin?.webContents.executeJavaScript(
              'window.open("https://actualbudget.org/docs", "_blank")',
            );
          },
        },
        {
          label: 'Community Support (Discord)',
          click(_menuItem, focusedWin) {
            focusedWin?.webContents.executeJavaScript(
              'window.open("https://discord.gg/pRYNYr4W5A", "_blank")',
            );
          },
        },
        {
          label: 'Keyboard Shortcuts',
          accelerator: '?',
          enabled: !!budgetId,
          click: function (_menuItem, focusedWin) {
            if (focusedWin) {
              focusedWin.webContents.executeJavaScript(
                'window.__actionsForMenu && !window.__actionsForMenu.inputFocused() && window.__actionsForMenu.pushModal({ modal: { name: "keyboard-shortcuts" } })',
              );
            }
          },
        },
      ],
    },
  ];

  if (process.platform === 'darwin') {
    const name = app.getName();
    template.unshift({
      label: name,
      submenu: [
        isDev
          ? {
              label: 'Screenshot',
              click() {
                ipcMain.emit('screenshot');
              },
            }
          : { label: 'hidden', visible: false },
        {
          type: 'separator',
        },
        {
          role: 'services',
          submenu: [],
        },
        {
          type: 'separator',
        },
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
    // Edit menu.
    const editIdx = template.findIndex(t => t.label === 'Edit');
    (template[editIdx].submenu as MenuItemConstructorOptions[]).push(
      {
        type: 'separator',
      },
      {
        label: 'Speech',
        submenu: [
          {
            role: 'startSpeaking',
          },
          {
            role: 'stopSpeaking',
          },
        ],
      },
    );
    // Window menu.
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
