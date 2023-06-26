import React, { createContext, useEffect, useContext } from 'react';

import hotkeys, { type KeyHandler as HotKeyHandler } from 'hotkeys-js';

let KeyScopeContext = createContext('app');

hotkeys.filter = event => {
  let target = (event.target || event.srcElement) as HTMLElement;
  let tagName = target.tagName;

  // This is the default behavior of hotkeys, except we only suppress
  // key presses if the meta key is not pressed
  if (
    !event.metaKey &&
    (target.isContentEditable ||
      ((tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT') &&
        !target['readOnly']))
  ) {
    return false;
  }

  return true;
};

type KeyHandlerProps = {
  keyName: string;
  eventType?: string;
  handler: HotKeyHandler;
};
function KeyHandler({
  keyName,
  eventType = 'keydown',
  handler,
}: KeyHandlerProps) {
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
      // @ts-expect-error unbind args typedef does not expect an object
      hotkeys.unbind({
        key: keyName,
        scope,
        method: _handler,
      });
    };
  }, [keyName, handler, scope]);

  return null;
}

type KeyHandlersProps = {
  eventType?: string;
  keys: Record<string, HotKeyHandler>;
};
export function KeyHandlers({ eventType, keys = {} }: KeyHandlersProps) {
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

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{handlers}</>;
}
