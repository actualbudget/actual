const { Menu, ipcMain, app, shell } = require('electron');

function getMenu(isDev, createWindow) {
  const template = [
    {
      label: 'File',
      submenu: [
        // {
        //   label: 'Start Tutorial',
        //   enabled: false,
        //   click(item, focusedWindow) {
        //     if (
        //       focusedWindow &&
        //       focusedWindow.webContents.getTitle() === 'Actual'
        //     ) {
        //       focusedWindow.webContents.executeJavaScript(
        //         '__actionsForMenu.startTutorial()'
        //       );
        //     }
        //   }
        // },
        {
          label: 'Load Backup...',
          enabled: false,
          click(item, focusedWindow) {
            if (focusedWindow) {
              if (focusedWindow.webContents.getTitle() === 'Actual') {
                focusedWindow.webContents.executeJavaScript(
                  "__actionsForMenu.replaceModal('load-backup')"
                );
              }
            }
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Manage files...',
          accelerator: 'CmdOrCtrl+O',
          click(item, focusedWindow) {
            if (focusedWindow) {
              if (focusedWindow.webContents.getTitle() === 'Actual') {
                focusedWindow.webContents.executeJavaScript(
                  '__actionsForMenu.closeBudget()'
                );
              } else {
                focusedWindow.close();
              }
            } else {
              // The default page is the budget list
              createWindow();
            }
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          enabled: false,
          accelerator: 'CmdOrCtrl+Z',
          click: function(menuItem, focusedWin) {
            // Undo
            focusedWin.webContents.executeJavaScript('__actionsForMenu.undo()');
          }
        },
        {
          label: 'Redo',
          enabled: false,
          accelerator: 'Shift+CmdOrCtrl+Z',
          click: function(menuItem, focusedWin) {
            // Redo
            focusedWin.webContents.executeJavaScript('__actionsForMenu.redo()');
          }
        },
        {
          type: 'separator'
        },
        {
          role: 'cut'
        },
        {
          role: 'copy'
        },
        {
          role: 'paste'
        },
        {
          role: 'pasteandmatchstyle'
        },
        {
          role: 'delete'
        },
        {
          role: 'selectall'
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        isDev && {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.reload();
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator:
            process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.webContents.toggleDevTools();
          }
        },
        isDev && {
          type: 'separator'
        },
        {
          role: 'resetzoom'
        },
        {
          role: 'zoomin'
        },
        {
          role: 'zoomout'
        },
        {
          type: 'separator'
        },
        {
          role: 'togglefullscreen'
        }
      ].filter(x => x)
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Find schedules',
          enabled: false,
          click: function(menuItem, focusedWin) {
            focusedWin.webContents.executeJavaScript(
              '__history && __history.push("/schedule/discover", { locationPtr: __history.location })'
            );
          }
        },
        {
          label: 'Repair split transactions',
          enabled: false,
          click: function(menuItem, focusedWin) {
            focusedWin.webContents.executeJavaScript(
              '__history && __history.push("/tools/fix-splits", { locationPtr: __history.location })'
            );
          }
        }
      ]
    },
    {
      role: 'window',
      submenu: [
        {
          role: 'minimize'
        }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click() {
            shell.openExternal('https://actualbudget.github.io/docs/');
          }
        }
      ]
    }
  ];

  if (process.platform === 'win32') {
    // Add about to help menu on Windows
    template[template.length - 1].submenu.unshift({
      label: 'About Actual',
      click() {
        ipcMain.emit('show-about');
      }
    });
  } else if (process.platform === 'darwin') {
    const name = app.getName();
    template.unshift({
      label: name,
      submenu: [
        {
          label: 'About Actual',
          click() {
            ipcMain.emit('show-about');
          }
        },
        isDev && {
          label: 'Screenshot',
          click() {
            ipcMain.emit('screenshot');
          }
        },
        {
          type: 'separator'
        },
        {
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          role: 'hide'
        },
        {
          role: 'hideothers'
        },
        {
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          role: 'quit'
        }
      ].filter(x => x)
    });
    // Edit menu.
    let editIdx = template.findIndex(t => t.label === 'Edit');
    template[editIdx].submenu.push(
      {
        type: 'separator'
      },
      {
        label: 'Speech',
        submenu: [
          {
            role: 'startspeaking'
          },
          {
            role: 'stopspeaking'
          }
        ]
      }
    );
    // Window menu.
    let windowIdx = template.findIndex(t => t.role === 'window');
    template[windowIdx].submenu = [
      {
        label: 'Close',
        accelerator: 'CmdOrCtrl+W',
        role: 'close'
      },
      {
        label: 'Minimize',
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize'
      },
      {
        label: 'Zoom',
        role: 'zoom'
      },
      {
        type: 'separator'
      },
      {
        label: 'Bring All to Front',
        role: 'front'
      }
    ];
  }

  return Menu.buildFromTemplate(template);
}

module.exports = getMenu;
