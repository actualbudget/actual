import React, { useState } from 'react';

import { Section } from '../guide/components';

import { View, Button } from './common';

const context = require.context('../svg/v1', false, /\.js$/);
const modules = {};
context.keys().forEach(function (key) {
  var module = context(key);
  modules[key] = module;
});

function pathToName(path) {
  const name = path.match(/^\.\/(.*)\.js$/)[1];
  return name[0].toUpperCase() + name.slice(1);
}

export default () => {
  let [show, setShow] = useState(false);

  return (
    <Section direction="vertical">
      {!show ? (
        <Button onClick={() => setShow(true)}>Show icons</Button>
      ) : (
        <View
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gridGap: 10,
            width: 500
          }}
        >
          {Object.keys(modules).map(path => {
            const Component = modules[path].default;
            return (
              <Section>
                {pathToName(path)}
                <div
                  style={{
                    width: 20,
                    height: 20,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Component width={25} />
                </div>
              </Section>
            );
          })}
        </View>
      )}
    </Section>
  );
};
