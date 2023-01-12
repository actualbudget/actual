import React from 'react';
import ReactDOM from 'react-dom';
import { Text, View, render as renderReactNative } from 'react-native';

import Platform from 'loot-core/src/client/platform';
import { TestProvider } from 'loot-core/src/mocks/redux';

global.IS_DESIGN_MODE = true;
window.Actual = {
  IS_FAKE_WEB: true
};

const modules = {};

function pathToName(path) {
  const name = path.match('./(.*).usage.js', '')[1];
  return name[0].toUpperCase() + name.slice(1);
}

function Usage({ name, render }) {
  return (
    <TestProvider>
      <div
        style={{
          margin: 40
        }}
      >
        <h1>{name}</h1>
        {render()}
      </div>
    </TestProvider>
  );
}

async function installPolyfills() {
  if ('ResizeObserver' in window === false) {
    const module = await import('@juggle/resize-observer');
    window.ResizeObserver = module.ResizeObserver;
  }
}

export default async function render(rootNode) {
  await installPolyfills();

  let filterMatch = window.location.search.match(/f=(.*)/);
  let filter = filterMatch ? filterMatch[1] : '';

  const guides = Object.keys(modules)
    .map(path => {
      // Do I need key???
      return {
        path,
        name: pathToName(path),
        key: path
      };
    })
    .filter(guide => guide.path.toLowerCase().includes(filter.toLowerCase()))
    .sort();

  guides.forEach(({ path, name, key }) => {
    const isMobileComponent = path.includes('/mobile');

    if (Platform.isReactNativeWeb !== isMobileComponent) {
      // Skip if the component is not for this environment
      return;
    }

    const mount = document.createElement('div');
    mount.id = path;
    rootNode.appendChild(mount);

    if (Platform.isReactNativeWeb) {
      mount.style.float = 'left';

      renderReactNative(
        <View style={{ margin: 40 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', paddingBottom: 15 }}>
            {name}
          </Text>
          {modules[key].default()}
        </View>,
        mount
      );
    } else {
      ReactDOM.render(
        <Usage name={name} render={modules[key].default} />,
        mount
      );
    }
  });
}

// Hot modules

var context = require.context('../components', true, /\.usage.js$/);

context.keys().forEach(function (key) {
  var module = context(key);
  modules[key] = module;
});

if (module.hot) {
  module.hot.accept(context.id, function () {
    var reloadedContext = require.context('../components', true, /\.usage.js$/);
    var changedModules = reloadedContext
      .keys()
      .map(function (key) {
        return [key, reloadedContext(key)];
      })
      .filter(function (reloadedModule) {
        return modules[reloadedModule[0]] !== reloadedModule[1];
      });
    changedModules.forEach(function (module) {
      modules[module[0]] = module[1];
      reloadUsage(module[0], module[1]);
    });
  });
}

function reloadUsage(path, module) {
  try {
    const scrollTop = document.documentElement.scrollTop;
    const mount = document.getElementById(path);
    ReactDOM.unmountComponentAtNode(mount);
    ReactDOM.render(
      <Usage name={pathToName(path)} render={module.default} updated={true} />,
      mount
    );
    document.documentElement.scrollTop = scrollTop;
  } catch (e) {
    console.log(e);
  }
}
