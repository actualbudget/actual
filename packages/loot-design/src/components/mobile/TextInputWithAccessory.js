import React from 'react';
import { TextInput } from 'react-native';

export default React.forwardRef(function TextInputWithAccessory(
  { accessoryId, ...props },
  ref
) {
  return <TextInput ref={ref} inputAccessoryViewID={accessoryId} {...props} />;
});
