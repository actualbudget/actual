import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

import { useRefEventListener } from './useRefEventListener';

export function useInputRefValue(
  inputRef: RefObject<HTMLInputElement | null>,
): [string, (newValue: string) => void] {
  const [value, setValue] = useState('');
  useRefEventListener(
    inputRef,
    'input',
    e => setValue((e.target as HTMLInputElement).value),
    [setValue],
  );
  useEffect(
    () => setValue(inputRef.current?.value ?? ''),
    [inputRef, setValue],
  );

  function _setValue(newValue: string) {
    if (!inputRef.current) return;
    // If we want to honor the input's onChange prop, we have
    // to use native value setter, then fire the 'input' event.
    // Doing normal inputRef.current.value = 'newval' and then
    // following that up with firing an event doesn't work, because
    // React will intercept that and change the value internally,
    // and when you go to fire an event, it will see that nothing has
    // changed since it last saw a value (it just updated it itself)
    // meaning no event will get fired. Or Something.
    // eslint-disable-next-line typescript-eslint(unbound-method)
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;
    nativeSetter?.call(inputRef.current, newValue);
    inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
  }
  return [value, _setValue];
}
