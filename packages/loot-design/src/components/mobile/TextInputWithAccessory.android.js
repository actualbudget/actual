import React, { useContext } from 'react';
import { TextInput } from 'react-native';
import { AccessoryIdContext } from './AndroidKeyboardAvoidingView';

export default React.forwardRef(function TextInputWithAccessory(
  { accessoryId, ...props },
  ref
) {
  let setAccessoryId = useContext(AccessoryIdContext);

  function onFocus(...args) {
    if (setAccessoryId) {
      setAccessoryId(accessoryId);
    }
    props.onFocus && props.onFocus(...args);
  }

  return <TextInput ref={ref} {...props} onFocus={onFocus} />;
});
