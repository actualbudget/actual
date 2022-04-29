import React, { useState, useEffect } from 'react';
import { KeyboardAvoidingView, NativeModules, Keyboard } from 'react-native';
import { AmountAccessoryView } from 'loot-design/src/components/mobile/AmountInput';
import { BudgetAccessoryView } from 'loot-design/src/components/mobile/budget';

let { StatusBarHeight } = NativeModules;

export let AccessoryIdContext = React.createContext();

function renderAccessoryView(id) {
  switch (id) {
    case 'budget':
      return <BudgetAccessoryView />;
    case 'amount':
      return <AmountAccessoryView />;
    default:
  }
  throw new Error('Unknown accessory view: ' + id);
}

export default function AndroidKeyboardAvoidingView({
  children,
  behavior = 'height',
  enabled = true,
  keyboardVerticalOffset = 0,
  includeStatusBar,
  style
}) {
  let [keyboard, setKeyboard] = useState(false);
  let [accessoryId, setAccessoryId] = useState(null);

  useEffect(() => {
    let cleanups = [
      Keyboard.addListener('keyboardDidShow', e => {
        setKeyboard(true);
      }),
      Keyboard.addListener('keyboardDidHide', e => {
        setKeyboard(false);

        // TODO: This is wrong. In Android, the user can hide the
        // keyboard and bring it back up again all while never losing
        // focus of the input. This means we'll render the accessory
        // view the first time but never again. Need to figure out a
        // better solution.
        setAccessoryId(null);
      })
    ];

    return () => cleanups.forEach(handler => handler.remove());
  }, []);

  return (
    <AccessoryIdContext.Provider value={setAccessoryId}>
      <KeyboardAvoidingView
        style={[{ flex: 1 }, style]}
        behavior={behavior}
        keyboardVerticalOffset={
          keyboardVerticalOffset +
          (includeStatusBar ? StatusBarHeight.statusBarHeight : 0)
        }
        enabled={enabled}
      >
        <>
          {children}
          {keyboard && accessoryId && renderAccessoryView(accessoryId)}
        </>
      </KeyboardAvoidingView>
    </AccessoryIdContext.Provider>
  );
}
