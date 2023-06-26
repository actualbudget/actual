const { BrowserWindow } = require('electron');
const isDev = require('electron-is-dev');

let window;

function openAboutWindow() {
  if (window != null) {
    window.focus();
    return window;
  }

  window = new BrowserWindow({
    width: 290,
    height: process.platform === 'win32' ? 255 : 240,
    show: true,
    resizable: isDev,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  window.setBackgroundColor('white');
  window.setTitle('');
  window.loadURL(`file://${__dirname}/about/about.html`);

  window.once('closed', () => {
    window = null;
  });
}

module.exports = { openAboutWindow, getWindow: () => window };
