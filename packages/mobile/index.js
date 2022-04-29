// This fixes a problem with a deprectecated `cancelTouches` property.
// Should be able to remove this at some point.
import 'react-native-gesture-handler';

import './sentry';
import { AppRegistry } from 'react-native';
import AppRoot from './client';
import VersionNumber from 'react-native-version-number';
import * as clientFetch from 'loot-core/src/platform/client/fetch';
import nodejs from 'nodejs-mobile-react-native';
import RNFetchBlob from 'rn-fetch-blob';

console.disableYellowBox = true;

let serverProxy = {
  onmessage: null,
  postMessage: msg => {
    nodejs.channel.send(msg);
  }
};

clientFetch.init(serverProxy);

nodejs.start('main.js');
nodejs.channel.addListener(
  'message',
  msg => {
    msg = JSON.parse(msg);

    if (msg.type === 'internal') {
      switch (msg.subtype) {
        case 'captureEvent':
          let event = msg.event;
          global.SentryClient.captureEvent(event);
          break;
        case 'captureBreadcrumb':
          global.SentryClient.addBreadcrumb(msg.breadcrumb);
          break;
        default:
      }

      return;
    } else {
      serverProxy.onmessage(msg);
    }
  },
  this
);

nodejs.channel.send(
  JSON.stringify({
    type: 'init',
    dataDir: RNFetchBlob.fs.dirs.DocumentDir,
    documentDir: RNFetchBlob.fs.dirs.DocumentDir,
    // eslint-disable-next-line
    dev: __DEV__,
    version: VersionNumber.appVersion
  })
);

// See promise error stack traces by re-throwing as normal errors
const tracking = require('promise/setimmediate/rejection-tracking'); // eslint-disable-line import/no-extraneous-dependencies

tracking.enable({
  allRejections: true,
  onUnhandled: (id, err) => {
    throw err;
  },
  onHandled: () => {}
});

const defaultErrorHandler = global.ErrorUtils.getGlobalHandler();
const myErrorHandler = (e, isFatal) => {
  // Suppress crashing the app
  // TODO: This shouldn't be silent, instead should show a fatal error UI
  //   Should add this handler in App.js and set React state
  defaultErrorHandler(e, false);
};
global.ErrorUtils.setGlobalHandler(myErrorHandler);

AppRegistry.registerComponent('actual', () => AppRoot);
