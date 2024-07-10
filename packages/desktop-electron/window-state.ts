import fs from 'fs';
import path from 'path';

import electron, { BrowserWindow } from 'electron';

const backend = undefined;
const getBackend = async () =>
  // eslint-disable-next-line import/extensions
  backend || (await import('loot-core/lib-dist/bundle.desktop.js'));

type WindowState = Electron.Rectangle & {
  isMaximized?: boolean;
  isFullScreen?: boolean;
  displayBounds?: Electron.Rectangle;
};

async function loadState() {
  let state: WindowState = undefined;
  const backend = await getBackend();
  try {
    state = JSON.parse(
      fs.readFileSync(
        path.join(backend.lib.getDataDir(), 'window.json'),
        'utf8',
      ),
    );
  } catch (e) {
    console.log('Could not load window state');
  }

  return validateState(state);
}

function updateState(win: BrowserWindow, state: WindowState) {
  const screen = electron.screen;
  const bounds = win.getBounds();
  if (!win.isMaximized() && !win.isMinimized() && !win.isFullScreen()) {
    state.x = bounds.x;
    state.y = bounds.y;
    state.width = bounds.width;
    state.height = bounds.height;
  }
  state.isMaximized = win.isMaximized();
  state.isFullScreen = win.isFullScreen();
  state.displayBounds = screen.getDisplayMatching(bounds).bounds;
}

async function saveState(win: BrowserWindow, state: WindowState) {
  const backend = await getBackend();
  updateState(win, state);
  fs.writeFileSync(
    path.join(backend.lib.getDataDir(), 'window.json'),
    JSON.stringify(state),
    'utf8',
  );
}

export function listen(win: BrowserWindow, state: WindowState) {
  if (state.isMaximized) {
    win.maximize();
  }
  if (state.isFullScreen) {
    win.setFullScreen(true);
  }

  const saver = saveState.bind(null, win, state);

  win.on('close', saver);

  return () => {
    win.removeListener('close', saver);
  };
}

function hasBounds(state: WindowState) {
  return (
    Number.isInteger(state.x) &&
    Number.isInteger(state.y) &&
    Number.isInteger(state.width) &&
    state.width > 0 &&
    Number.isInteger(state.height) &&
    state.height > 0
  );
}

function validateState(state?: WindowState): Partial<WindowState> {
  if (
    !state ||
    !(hasBounds(state) || state.isMaximized || state.isFullScreen)
  ) {
    return {};
  }

  const newState = Object.assign({}, state);

  if (hasBounds(state) && state.displayBounds) {
    const screen = electron.screen;

    // Check if the display where the window was last open is still available
    const displayBounds = screen.getDisplayMatching(state).bounds;

    if (
      state.displayBounds.x !== displayBounds.x ||
      state.displayBounds.y !== displayBounds.y ||
      state.displayBounds.width !== displayBounds.width ||
      state.displayBounds.height !== displayBounds.height
    ) {
      if (displayBounds.width < state.displayBounds.width) {
        if (state.x > displayBounds.width) {
          newState.x = 0;
        }

        if (state.width > displayBounds.width) {
          newState.width = displayBounds.width;
        }
      }

      if (displayBounds.height < state.displayBounds.height) {
        if (state.y > displayBounds.height) {
          newState.y = 0;
        }

        if (state.height > displayBounds.height) {
          newState.height = displayBounds.height;
        }
      }
    }
  }

  return newState;
}

export async function get() {
  const screen = electron.screen;
  const displayBounds = screen.getPrimaryDisplay().bounds;

  const state: WindowState = Object.assign(
    {
      x: 100,
      y: 50,
      width: Math.min(1000, displayBounds.width - 100),
      height: Math.min(700, displayBounds.width - 50),
    },
    await loadState(),
  );

  return state;
}
