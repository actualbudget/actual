import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

export default function TransitionView({ navigation, children }) {
  let fadeAnim = useRef(new Animated.Value(1)).current;
  let focused = useIsFocused();
  let prevFocused = useRef(focused);

  // A cheap effect to make up for the fact that we are using transparent cards,
  // and the new native animator doesn't automatically fade out the previous
  // card as it's going away (or coming in if going back). This works fine for
  // navigating forwards, but less than ideal going backwards because it won't
  // fade in until the gesture finishes. Need to look into how to perform custom
  // gesture-based navigations
  useEffect(() => {
    if (prevFocused.current !== focused) {
      Animated.timing(fadeAnim, {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [focused]);

  useEffect(() => {
    prevFocused.current = focused;
  });

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }} children={children} />
  );
}
