import React from 'react';
import { TouchableOpacity } from 'react-native';

let NoopComponent = React.forwardRef(({ children }, ref) => children);

export const RectButton = React.forwardRef((props, ref) => {
  return <TouchableOpacity ref={ref} {...props} />;
});

export let Swipeable = NoopComponent;
export let PanGestureHandler = NoopComponent;
export let TapGestureHandler = NoopComponent;
export let LongPressGestureHandler = NoopComponent;
export let NativeViewGestureHandler = NoopComponent;

export let State = {};
