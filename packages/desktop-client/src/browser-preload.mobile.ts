// Preload for the native iOS and Android (Capacitor) apps. The mobile build
// (`vite build --mode=mobile`) resolves `#browser-preload` to this file, so
// native-only code stays out of the bundle that web users download.
//
// The apps run the same web app, so this starts from the browser preload and
// replaces only what has to go through the native shell.
import './browser-preload.js';
import { saveFileInNativeApp } from './util/saveFileInNativeApp';

window.Actual.saveFile = saveFileInNativeApp;
