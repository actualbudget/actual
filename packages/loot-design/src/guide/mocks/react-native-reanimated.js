import React from 'react';
import { ScrollView } from 'react-native';
import makeMockObject from './makeMockObject';

let NoopComponent = React.forwardRef(({ children }, ref) => children);

let Animated = makeMockObject({
  View: NoopComponent,
  ScrollView,
  Value: class {}
});

export default Animated;
export let Easing = makeMockObject({});
