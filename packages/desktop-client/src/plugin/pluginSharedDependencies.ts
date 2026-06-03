import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as ReactI18next from 'react-i18next';

import * as I18next from 'i18next';

export function getPluginSharedDependencies() {
  return {
    react: {
      lib: () => React,
      shareConfig: {
        singleton: true,
        requiredVersion: '19.2.4',
      },
    },
    'react-dom': {
      lib: () => ReactDOM,
      shareConfig: {
        singleton: true,
        requiredVersion: '19.2.4',
      },
    },
    'react-dom/client': {
      lib: () => ReactDOMClient,
      shareConfig: {
        singleton: true,
        requiredVersion: '19.2.4',
      },
    },
    'react-i18next': {
      lib: () => ReactI18next,
      shareConfig: {
        singleton: true,
        requiredVersion: '^16.6.6',
      },
    },
    i18next: {
      lib: () => I18next,
      shareConfig: {
        singleton: true,
        requiredVersion: '^25.10.10',
      },
    },
  };
}
