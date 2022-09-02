import React, { useEffect, useContext } from 'react';

import hotkeys from 'hotkeys-js';

let KeyScopeContext = React.createContext('app');

hotkeys.filter = event => {
  var target = event.target || event.srcElement;
  var tagName = target.tagName;

  // This is the default behavior of hotkeys, except we only suppress
  // key presses if the meta key is not pressed
  if (
    !event.metaKey &&
    (target.isContentEditable ||
      ((tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT') &&
        !target.readOnly))
  ) {
    return false;
  }

  return true;
};

export function KeyHandler({ keyName, eventType = 'keydown', handler }) {
  let scope = useContext(KeyScopeContext);

  if (eventType !== 'keyup' && eventType !== 'keydown') {
    throw new Error('KeyHandler: unknown event type: ' + eventType);
  }

  useEffect(() => {
    function _handler(event, hk) {
      // Right now it always overrides the default behavior, but in
      // the future we can make this customizable
      event.preventDefault();

      if (event.type === eventType && handler) {
        return handler(event, hk);
      }
    }
    hotkeys(keyName, { scope, keyup: true }, _handler);

    return () => {
      hotkeys.unbind({
        key: keyName,
        scope,
        method: _handler
      });
    };
  }, [keyName, handler, scope]);

  return null;
}

export function KeyHandlers({ eventType, keys = {} }) {
  let handlers = Object.keys(keys).map(key => {
    return (
      <KeyHandler
        key={key}
        keyName={key}
        eventType={eventType}
        handler={keys[key]}
      />
    );
  });

  return handlers;
}
